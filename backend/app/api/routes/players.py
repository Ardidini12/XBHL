import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    League,
    Player,
    PlayerDetailPublic,
    PlayerFilterOption,
    PlayerLeagueGroup,
    PlayerMatchStats,
    PlayerMatchStatsPublic,
    PlayerSeasonGroup,
    PlayerStatTotals,
    PlayersPublic,
    PlayerPublic,
    Season,
)

router = APIRouter(tags=["players"])


def _compute_totals(stats: list[PlayerMatchStatsPublic]) -> PlayerStatTotals:
    if not stats:
        return PlayerStatTotals()

    gp = len(stats)
    goals = sum(s.skgoals or 0 for s in stats)
    assists = sum(s.skassists or 0 for s in stats)
    shots = sum(s.skshots or 0 for s in stats)
    fow = sum(s.skfow or 0 for s in stats)
    fol = sum(s.skfol or 0 for s in stats)
    pa = sum(s.skpassattempts or 0 for s in stats)
    pc = sum(s.skpasses or 0 for s in stats)
    gl_saves = sum(s.glsaves or 0 for s in stats)
    gl_shots = sum(s.glshots or 0 for s in stats)

    return PlayerStatTotals(
        games_played=gp,
        goals=goals,
        assists=assists,
        points=goals + assists,
        plus_minus=sum(s.skplusmin or 0 for s in stats),
        hits=sum(s.skhits or 0 for s in stats),
        shots=shots,
        shot_pct=round(goals / shots * 100, 2) if shots else 0.0,
        pim=sum(s.skpim or 0 for s in stats),
        takeaways=sum(s.sktakeaways or 0 for s in stats),
        giveaways=sum(s.skgiveaways or 0 for s in stats),
        faceoff_wins=fow,
        faceoff_losses=fol,
        faceoff_pct=round(fow / (fow + fol) * 100, 2) if (fow + fol) else 0.0,
        toi_seconds=sum(s.toiseconds or 0 for s in stats),
        blocked_shots=sum(s.skbs or 0 for s in stats),
        interceptions=sum(s.skinterceptions or 0 for s in stats),
        pass_attempts=pa,
        passes_completed=pc,
        pass_pct=round(pc / pa * 100, 2) if pa else 0.0,
        gwg=sum(s.skgwg or 0 for s in stats),
        ppg=sum(s.skppg or 0 for s in stats),
        shg=sum(s.skshg or 0 for s in stats),
        deflections=sum(s.skdeflections or 0 for s in stats),
        shot_attempts=sum(s.skshotattempts or 0 for s in stats),
        saucer_passes=sum(s.sksaucerpasses or 0 for s in stats),
        penalties_drawn=sum(s.skpenaltiesdrawn or 0 for s in stats),
        pk_clear_zone=sum(s.skpkclearzone or 0 for s in stats),
        possession=sum(s.skpossession or 0 for s in stats),
        gl_saves=gl_saves,
        gl_ga=sum(s.glga or 0 for s in stats),
        gl_shots=gl_shots,
        gl_save_pct=round(gl_saves / gl_shots * 100, 2) if gl_shots else 0.0,
        gl_so_periods=sum(s.glsoperiods or 0 for s in stats),
        gl_brk_saves=sum(s.glbrksaves or 0 for s in stats),
        gl_brk_shots=sum(s.glbrkshots or 0 for s in stats),
        gl_pen_saves=sum(s.glpensaves or 0 for s in stats),
        gl_pen_shots=sum(s.glpenshots or 0 for s in stats),
        gl_poke_checks=sum(s.glpokechecks or 0 for s in stats),
        gl_pk_clear_zone=sum(s.glpkclearzone or 0 for s in stats),
        gl_dsaves=sum(s.gldsaves or 0 for s in stats),
    )


def _build_grouped_response(
    session: Session,
    player: Player,
    stats_rows: list[PlayerMatchStats],
) -> PlayerDetailPublic:
    stats_public = [PlayerMatchStatsPublic.model_validate(s) for s in stats_rows]

    # Collect all unique season_ids from the stats
    season_ids: set[uuid.UUID] = set()
    for s in stats_rows:
        if s.season_id:
            season_ids.add(s.season_id)

    # Batch-load seasons + leagues (avoid N+1)
    season_map: dict[uuid.UUID, Season] = {}
    league_map: dict[uuid.UUID, League] = {}
    if season_ids:
        seasons = session.exec(
            select(Season).where(col(Season.id).in_(list(season_ids)))
        ).all()
        for sn in seasons:
            season_map[sn.id] = sn

        league_ids = {sn.league_id for sn in seasons}
        if league_ids:
            leagues = session.exec(
                select(League).where(col(League.id).in_(list(league_ids)))
            ).all()
            for lg in leagues:
                league_map[lg.id] = lg

    # Group stats by league_id -> season_id -> list[stats]
    grouped: dict[uuid.UUID, dict[uuid.UUID, list[PlayerMatchStatsPublic]]] = defaultdict(lambda: defaultdict(list))
    for sp, sr in zip(stats_public, stats_rows, strict=True):
        sid = sr.season_id
        if sid and sid in season_map:
            lid = season_map[sid].league_id
            grouped[lid][sid].append(sp)

    # Build league groups
    league_groups: list[PlayerLeagueGroup] = []
    all_stats_for_career: list[PlayerMatchStatsPublic] = []

    for lid in sorted(grouped.keys(), key=lambda x: league_map.get(x, League()).name or ""):
        lg = league_map.get(lid)
        lg_name = lg.name if lg else "Unknown"

        season_groups: list[PlayerSeasonGroup] = []
        league_stats: list[PlayerMatchStatsPublic] = []

        for sid in sorted(grouped[lid].keys(), key=lambda x: season_map.get(x, Season()).name or ""):
            sn = season_map.get(sid)
            sn_name = sn.name if sn else "Unknown"
            match_stats = sorted(grouped[lid][sid], key=lambda x: x.ea_timestamp or 0, reverse=True)

            season_groups.append(PlayerSeasonGroup(
                season_id=sid,
                season_name=sn_name,
                league_id=lid,
                league_name=lg_name,
                stats=match_stats,
                totals=_compute_totals(match_stats),
            ))
            league_stats.extend(match_stats)

        league_groups.append(PlayerLeagueGroup(
            league_id=lid,
            league_name=lg_name,
            seasons=season_groups,
            totals=_compute_totals(league_stats),
        ))
        all_stats_for_career.extend(league_stats)

    # Available filters (all seasons/leagues this player has data for)
    available_seasons: list[PlayerFilterOption] = []
    for sid, sn in sorted(season_map.items(), key=lambda x: x[1].name):
        lg = league_map.get(sn.league_id)
        available_seasons.append(PlayerFilterOption(
            id=sid,
            name=sn.name,
            league_id=sn.league_id,
            league_name=lg.name if lg else None,
        ))

    available_leagues: list[PlayerFilterOption] = []
    for lid, lg in sorted(league_map.items(), key=lambda x: x[1].name):
        available_leagues.append(PlayerFilterOption(
            id=lid,
            name=lg.name,
        ))

    return PlayerDetailPublic(
        id=player.id,
        ea_player_id=player.ea_player_id,
        gamertag=player.gamertag,
        created_at=player.created_at,
        updated_at=player.updated_at,
        available_seasons=available_seasons,
        available_leagues=available_leagues,
        leagues=league_groups,
        career_totals=_compute_totals(all_stats_for_career),
    )


@router.get(
    "/players/",
    response_model=PlayersPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def list_players(
    session: SessionDep,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
) -> PlayersPublic:
    query = select(Player)
    count_query = select(func.count()).select_from(Player)

    if search:
        pattern = f"%{search}%"
        query = query.where(col(Player.gamertag).ilike(pattern))
        count_query = count_query.where(col(Player.gamertag).ilike(pattern))

    count = session.exec(count_query).one()
    players = session.exec(
        query.order_by(col(Player.gamertag)).offset(skip).limit(limit)
    ).all()

    return PlayersPublic(
        data=[PlayerPublic.model_validate(p) for p in players],
        count=count,
    )


@router.get(
    "/players/{ea_player_id}",
    response_model=PlayerDetailPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_player(
    ea_player_id: str,
    session: SessionDep,
    season_id: uuid.UUID | None = None,
    league_id: uuid.UUID | None = None,
) -> PlayerDetailPublic:
    player = session.exec(
        select(Player).where(Player.ea_player_id == ea_player_id)
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found.")

    query = (
        select(PlayerMatchStats)
        .where(PlayerMatchStats.player_id == player.id)
    )

    if season_id:
        query = query.where(PlayerMatchStats.season_id == season_id)
    elif league_id:
        season_ids = session.exec(
            select(Season.id).where(Season.league_id == league_id)
        ).all()
        if season_ids:
            query = query.where(col(PlayerMatchStats.season_id).in_(season_ids))
        else:
            query = query.where(PlayerMatchStats.season_id == None)  # noqa: E711

    stats_rows = session.exec(
        query.order_by(col(PlayerMatchStats.ea_timestamp).desc())
    ).all()

    return _build_grouped_response(session, player, stats_rows)

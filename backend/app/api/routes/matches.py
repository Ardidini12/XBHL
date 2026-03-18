import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Club,
    League,
    Match,
    MatchWithContext,
    MatchesPublic,
    Season,
)

router = APIRouter(tags=["matches"])


def _enrich_matches(matches: list[Match], session: Session) -> list[MatchWithContext]:
    if not matches:
        return []

    # Batch-load all referenced seasons, leagues, and clubs
    season_ids = {m.season_id for m in matches}
    club_ids = {m.club_id for m in matches}

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

    club_map: dict[uuid.UUID, Club] = {}
    if club_ids:
        clubs = session.exec(
            select(Club).where(col(Club.id).in_(list(club_ids)))
        ).all()
        for c in clubs:
            club_map[c.id] = c

    result: list[MatchWithContext] = []
    for m in matches:
        sn = season_map.get(m.season_id)
        lg = league_map.get(sn.league_id) if sn else None
        club = club_map.get(m.club_id)
        club_ea_id = club.ea_id if club else None

        is_home: bool | None = None
        opponent_ea_id: str | None = None
        if club_ea_id and m.home_club_ea_id and m.away_club_ea_id:
            if club_ea_id == m.home_club_ea_id:
                is_home = True
                opponent_ea_id = m.away_club_ea_id
            elif club_ea_id == m.away_club_ea_id:
                is_home = False
                opponent_ea_id = m.home_club_ea_id

        result.append(MatchWithContext(
            id=m.id,
            ea_match_id=m.ea_match_id,
            ea_timestamp=m.ea_timestamp,
            season_id=m.season_id,
            club_id=m.club_id,
            home_club_ea_id=m.home_club_ea_id,
            away_club_ea_id=m.away_club_ea_id,
            home_score=m.home_score,
            away_score=m.away_score,
            created_at=m.created_at,
            season_name=sn.name if sn else None,
            league_name=lg.name if lg else None,
            is_home=is_home,
            opponent_ea_id=opponent_ea_id,
        ))
    return result


@router.get(
    "/matches/",
    response_model=MatchesPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_all_matches(
    session: SessionDep,
    skip: int = 0,
    limit: int = 50,
    season_id: uuid.UUID | None = None,
    club_id: uuid.UUID | None = None,
    league_id: uuid.UUID | None = None,
) -> MatchesPublic:
    query = select(Match)

    if league_id:
        season_ids = session.exec(
            select(Season.id).where(Season.league_id == league_id)
        ).all()
        if not season_ids:
            return MatchesPublic(data=[], count=0)
        query = query.where(col(Match.season_id).in_(season_ids))

    if season_id:
        query = query.where(Match.season_id == season_id)

    if club_id:
        query = query.where(Match.club_id == club_id)

    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    matches = session.exec(
        query.order_by(col(Match.ea_timestamp).desc()).offset(skip).limit(limit)
    ).all()

    return MatchesPublic(
        data=_enrich_matches(list(matches), session),
        count=count,
    )


@router.get(
    "/clubs/{club_id}/matches",
    response_model=MatchesPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_club_matches(
    club_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> MatchesPublic:
    club = session.get(Club, club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found.")

    count = session.exec(
        select(func.count())
        .select_from(Match)
        .where(Match.club_id == club_id)
    ).one()

    matches = session.exec(
        select(Match)
        .where(Match.club_id == club_id)
        .order_by(col(Match.ea_timestamp).desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return MatchesPublic(
        data=_enrich_matches(list(matches), session),
        count=count,
    )


@router.get(
    "/seasons/{season_id}/matches",
    response_model=MatchesPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_season_matches(
    season_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> MatchesPublic:
    season = session.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found.")

    count = session.exec(
        select(func.count())
        .select_from(Match)
        .where(Match.season_id == season_id)
    ).one()

    matches = session.exec(
        select(Match)
        .where(Match.season_id == season_id)
        .order_by(col(Match.ea_timestamp).desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return MatchesPublic(
        data=_enrich_matches(list(matches), session),
        count=count,
    )

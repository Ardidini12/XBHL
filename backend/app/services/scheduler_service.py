import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

NY_TZ = ZoneInfo("America/New_York")

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, col, select

from app.core.db import engine
from app.models import (
    Club,
    ClubSeasonRelationship,
    Match,
    Player,
    PlayerMatchStats,
    SchedulerConfig,
    SchedulerRun,
    SchedulerRunStatus,
    Season,
)
from app.services import ea_client

logger = logging.getLogger(__name__)

# Global APScheduler instance
_scheduler = AsyncIOScheduler(timezone="UTC")

# In-memory registry: season_id (str) -> APScheduler job_id (str)
_job_registry: dict[str, str] = {}


def get_scheduler() -> AsyncIOScheduler:
    return _scheduler


def _job_id(season_id: uuid.UUID) -> str:
    return f"season_{season_id}"


# ---------------------------------------------------------------------------
# Core fetch job
# ---------------------------------------------------------------------------

async def _run_fetch_job(season_id_str: str) -> None:
    """APScheduler calls this. Fetches EA matches for all clubs in the season."""
    season_id = uuid.UUID(season_id_str)

    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()

        if not config or not config.is_active or config.is_paused:
            logger.info("Scheduler for season %s is inactive/paused — skipping.", season_id)
            return

        # Check hour window and season date range (all comparisons in America/New_York)
        now_et = datetime.now(NY_TZ)
        current_hour = now_et.hour
        current_dow = now_et.weekday()  # 0=Mon, 6=Sun
        today_et = now_et.date()

        # Fetch the season to check its date bounds
        season = session.get(Season, season_id)
        if season:
            season_start = season.start_date.astimezone(NY_TZ).date()
            if today_et < season_start:
                logger.debug(
                    "Scheduler for season %s: before season start (%s), today=%s.",
                    season_id, season_start, today_et,
                )
                return
            if season.end_date is not None:
                season_end = season.end_date.astimezone(NY_TZ).date()
                if today_et > season_end:
                    logger.debug(
                        "Scheduler for season %s: after season end (%s), today=%s.",
                        season_id, season_end, today_et,
                    )
                    return

        if config.days_of_week and current_dow not in config.days_of_week:
            logger.debug("Scheduler for season %s: not a scheduled day (%s).", season_id, current_dow)
            return

        if not (config.start_hour <= current_hour < config.end_hour):
            logger.debug(
                "Scheduler for season %s: outside active hours (%s–%s), current=%s.",
                season_id, config.start_hour, config.end_hour, current_hour,
            )
            return

        # Create audit run record
        run = SchedulerRun(
            scheduler_config_id=config.id,
            season_id=season_id,
            status=SchedulerRunStatus.RUNNING,
        )
        session.add(run)
        session.commit()
        session.refresh(run)

        matches_fetched = 0
        matches_new = 0
        error_message: str | None = None

        try:
            # Get all clubs in this season
            club_links = session.exec(
                select(ClubSeasonRelationship).where(
                    ClubSeasonRelationship.season_id == season_id
                )
            ).all()

            if not club_links:
                logger.info("Scheduler for season %s: no clubs found.", season_id)
            else:
                for link in club_links:
                    club = session.get(Club, link.club_id)
                    if not club:
                        continue

                    # Step 1: resolve / refresh EA ID
                    ea_id = await ea_client.search_club(club.name)
                    if ea_id and ea_id != club.ea_id:
                        club.ea_id = ea_id
                        session.add(club)
                        session.commit()
                        logger.info("Updated ea_id for club '%s' → %s", club.name, ea_id)

                    if not club.ea_id:
                        logger.warning("No EA ID found for club '%s', skipping.", club.name)
                        continue

                    # Step 2: fetch matches
                    raw_matches = await ea_client.fetch_matches(club.ea_id)
                    matches_fetched += len(raw_matches)

                    for raw in raw_matches:
                        new_count = _store_match(session, raw, season_id, club.id)
                        matches_new += new_count

            run.status = SchedulerRunStatus.SUCCESS

        except Exception as exc:
            error_message = str(exc)
            run.status = SchedulerRunStatus.FAILED
            logger.exception("Scheduler job failed for season %s: %s", season_id, exc)

        finally:
            run.finished_at = datetime.now(timezone.utc)
            run.matches_fetched = matches_fetched
            run.matches_new = matches_new
            run.error_message = error_message
            session.add(run)
            session.commit()

            # Keep only the last 5 runs per scheduler config
            _prune_runs(session, config.id)


def _store_match(
    session: Session,
    raw: dict[str, Any],
    season_id: uuid.UUID,
    club_id: uuid.UUID,
) -> int:
    """
    Parse one raw EA match dict and insert if not already stored.
    Returns 1 if inserted, 0 if duplicate or skipped.
    All fields are treated as nullable.
    """
    ea_match_id: str | None = raw.get("matchId")
    ea_timestamp: int | None = raw.get("timestamp")

    if not ea_match_id or ea_timestamp is None:
        return 0

    # Deduplication check
    existing = session.exec(
        select(Match).where(
            Match.ea_match_id == ea_match_id,
            Match.ea_timestamp == ea_timestamp,
            Match.club_id == club_id,
        )
    ).first()
    if existing:
        return 0

    clubs_data: dict[str, Any] = raw.get("clubs") or {}

    # Determine home/away from teamSide ("0" = home, "1" = away)
    home_club_ea_id: str | None = None
    away_club_ea_id: str | None = None
    home_score: int | None = None
    away_score: int | None = None

    for cid, cdata in clubs_data.items():
        if not isinstance(cdata, dict):
            continue
        team_side = cdata.get("teamSide")
        score_raw = cdata.get("score")
        score = int(score_raw) if score_raw is not None else None
        if str(team_side) == "0":
            home_club_ea_id = str(cid)
            home_score = score
        elif str(team_side) == "1":
            away_club_ea_id = str(cid)
            away_score = score

    match = Match(
        ea_match_id=ea_match_id,
        ea_timestamp=ea_timestamp,
        season_id=season_id,
        club_id=club_id,
        home_club_ea_id=home_club_ea_id,
        away_club_ea_id=away_club_ea_id,
        home_score=home_score,
        away_score=away_score,
        raw_json=raw,
    )
    session.add(match)
    try:
        session.commit()
        session.refresh(match)
        _extract_and_store_players(session, raw, match.id)
        return 1
    except Exception:
        session.rollback()
        return 0


def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def _extract_and_store_players(
    session: Session,
    raw: dict[str, Any],
    match_id: uuid.UUID,
) -> None:
    """
    Extract all players from both clubs in a raw EA match dict.
    Upserts Player rows and inserts PlayerMatchStats rows (deduped by ea_player_id + ea_match_id).
    """
    ea_match_id: str | None = raw.get("matchId")
    ea_timestamp: int | None = raw.get("timestamp")

    if not ea_match_id:
        return

    players_data: dict[str, Any] = raw.get("players") or {}

    for _club_ea_id, players_in_club in players_data.items():
        if not isinstance(players_in_club, dict):
            continue

        for ea_player_id_str, pdata in players_in_club.items():
            if not isinstance(pdata, dict):
                continue

            gamertag: str = pdata.get("playername") or ea_player_id_str

            # Upsert Player by ea_player_id
            player = session.exec(
                select(Player).where(Player.ea_player_id == ea_player_id_str)
            ).first()

            if not player:
                player = Player(ea_player_id=ea_player_id_str, gamertag=gamertag)
                session.add(player)
                session.commit()
                session.refresh(player)
            elif player.gamertag != gamertag:
                player.gamertag = gamertag
                player.updated_at = datetime.now(timezone.utc)
                session.add(player)
                session.commit()

            # Dedup: skip if stat row already exists
            existing_stat = session.exec(
                select(PlayerMatchStats).where(
                    PlayerMatchStats.ea_player_id == ea_player_id_str,
                    PlayerMatchStats.ea_match_id == ea_match_id,
                )
            ).first()
            if existing_stat:
                continue

            stat = PlayerMatchStats(
                player_id=player.id,
                ea_player_id=ea_player_id_str,
                ea_match_id=ea_match_id,
                ea_timestamp=ea_timestamp,
                match_id=match_id,
                stat_class=_safe_int(pdata.get("class")),
                glbrksavepct=_safe_float(pdata.get("glbrksavepct")),
                glbrksaves=_safe_int(pdata.get("glbrksaves")),
                glbrkshots=_safe_int(pdata.get("glbrkshots")),
                gldsaves=_safe_int(pdata.get("gldsaves")),
                glga=_safe_int(pdata.get("glga")),
                glgaa=_safe_float(pdata.get("glgaa")),
                glpensavepct=_safe_float(pdata.get("glpensavepct")),
                glpensaves=_safe_int(pdata.get("glpensaves")),
                glpenshots=_safe_int(pdata.get("glpenshots")),
                glpkclearzone=_safe_int(pdata.get("glpkclearzone")),
                glpokechecks=_safe_int(pdata.get("glpokechecks")),
                glsavepct=_safe_float(pdata.get("glsavepct")),
                glsaves=_safe_int(pdata.get("glsaves")),
                glshots=_safe_int(pdata.get("glshots")),
                glsoperiods=_safe_int(pdata.get("glsoperiods")),
                is_guest=_safe_int(pdata.get("isGuest")),
                opponent_club_id=pdata.get("opponentClubId"),
                opponent_score=_safe_int(pdata.get("opponentScore")),
                opponent_team_id=pdata.get("opponentTeamId"),
                player_dnf=_safe_int(pdata.get("player_dnf")),
                player_level=_safe_int(pdata.get("playerLevel")),
                p_nhl_online_game_type=pdata.get("pNhlOnlineGameType"),
                position=pdata.get("position"),
                pos_sorted=_safe_int(pdata.get("posSorted")),
                rating_defense=_safe_float(pdata.get("ratingDefense")),
                rating_offense=_safe_float(pdata.get("ratingOffense")),
                rating_teamplay=_safe_float(pdata.get("ratingTeamplay")),
                score=_safe_int(pdata.get("score")),
                skassists=_safe_int(pdata.get("skassists")),
                skbs=_safe_int(pdata.get("skbs")),
                skdeflections=_safe_int(pdata.get("skdeflections")),
                skfol=_safe_int(pdata.get("skfol")),
                skfopct=_safe_float(pdata.get("skfopct")),
                skfow=_safe_int(pdata.get("skfow")),
                skgiveaways=_safe_int(pdata.get("skgiveaways")),
                skgoals=_safe_int(pdata.get("skgoals")),
                skgwg=_safe_int(pdata.get("skgwg")),
                skhits=_safe_int(pdata.get("skhits")),
                skinterceptions=_safe_int(pdata.get("skinterceptions")),
                skpassattempts=_safe_int(pdata.get("skpassattempts")),
                skpasses=_safe_int(pdata.get("skpasses")),
                skpasspct=_safe_float(pdata.get("skpasspct")),
                skpenaltiesdrawn=_safe_int(pdata.get("skpenaltiesdrawn")),
                skpim=_safe_int(pdata.get("skpim")),
                skpkclearzone=_safe_int(pdata.get("skpkclearzone")),
                skplusmin=_safe_int(pdata.get("skplusmin")),
                skpossession=_safe_int(pdata.get("skpossession")),
                skppg=_safe_int(pdata.get("skppg")),
                sksaucerpasses=_safe_int(pdata.get("sksaucerpasses")),
                skshg=_safe_int(pdata.get("skshg")),
                skshotattempts=_safe_int(pdata.get("skshotattempts")),
                skshotonnetpct=_safe_float(pdata.get("skshotonnetpct")),
                skshotpct=_safe_float(pdata.get("skshotpct")),
                skshots=_safe_int(pdata.get("skshots")),
                sktakeaways=_safe_int(pdata.get("sktakeaways")),
                team_id=pdata.get("teamId"),
                team_side=_safe_int(pdata.get("teamSide")),
                toi=_safe_int(pdata.get("toi")),
                toiseconds=_safe_int(pdata.get("toiseconds")),
                client_platform=pdata.get("clientPlatform"),
            )
            session.add(stat)
            try:
                session.commit()
            except Exception:
                session.rollback()
                logger.warning(
                    "Duplicate/failed player stat insert: player=%s match=%s",
                    ea_player_id_str, ea_match_id,
                )


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

def _schedule_job(config: SchedulerConfig) -> None:
    """Add or replace an APScheduler job for a given config."""
    jid = _job_id(config.season_id)
    season_id_str = str(config.season_id)

    if _scheduler.get_job(jid):
        _scheduler.remove_job(jid)

    total_seconds = config.interval_minutes * 60 + getattr(config, "interval_seconds", 0)
    _scheduler.add_job(
        _run_fetch_job,
        trigger=IntervalTrigger(seconds=total_seconds),
        id=jid,
        args=[season_id_str],
        replace_existing=True,
        misfire_grace_time=60,
    )
    _job_registry[season_id_str] = jid
    logger.info(
        "Scheduled job for season %s every %sm %ss.",
        config.season_id, config.interval_minutes, getattr(config, "interval_seconds", 0),
    )


def start_scheduler(config: SchedulerConfig) -> None:
    """Mark config active, schedule the job."""
    with Session(engine) as session:
        db_config = session.get(SchedulerConfig, config.id)
        if db_config:
            db_config.is_active = True
            db_config.is_paused = False
            db_config.updated_at = datetime.now(timezone.utc)
            session.add(db_config)
            session.commit()
            session.refresh(db_config)
            _schedule_job(db_config)


def stop_scheduler(season_id: uuid.UUID) -> None:
    """Stop job, mark config inactive (preserves config)."""
    jid = _job_id(season_id)
    if _scheduler.get_job(jid):
        _scheduler.remove_job(jid)
    _job_registry.pop(str(season_id), None)

    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()
        if config:
            config.is_active = False
            config.is_paused = False
            config.updated_at = datetime.now(timezone.utc)
            session.add(config)
            session.commit()
    logger.info("Stopped scheduler for season %s.", season_id)


def pause_scheduler(season_id: uuid.UUID) -> None:
    """Pause job (job stays registered but hour-check will skip it)."""
    jid = _job_id(season_id)
    job = _scheduler.get_job(jid)
    if job:
        job.pause()

    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()
        if config:
            config.is_paused = True
            config.updated_at = datetime.now(timezone.utc)
            session.add(config)
            session.commit()
    logger.info("Paused scheduler for season %s.", season_id)


def resume_scheduler(season_id: uuid.UUID) -> None:
    """Resume a paused job."""
    jid = _job_id(season_id)
    job = _scheduler.get_job(jid)
    if job:
        job.resume()
    else:
        # Job was removed; re-schedule from DB config
        with Session(engine) as session:
            config = session.exec(
                select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
            ).first()
            if config:
                _schedule_job(config)

    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()
        if config:
            config.is_paused = False
            config.is_active = True
            config.updated_at = datetime.now(timezone.utc)
            session.add(config)
            session.commit()
    logger.info("Resumed scheduler for season %s.", season_id)


def delete_scheduler(season_id: uuid.UUID) -> None:
    """Stop job and delete config + runs from DB."""
    stop_scheduler(season_id)
    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()
        if config:
            session.delete(config)
            session.commit()
    logger.info("Deleted scheduler config for season %s.", season_id)


def restart_scheduler(config: SchedulerConfig) -> None:
    """Stop existing job and start fresh with updated config."""
    stop_scheduler(config.season_id)
    start_scheduler(config)


def is_job_running(season_id: uuid.UUID) -> bool:
    jid = _job_id(season_id)
    job = _scheduler.get_job(jid)
    return job is not None and not getattr(job, "next_run_time", None) is None


# ---------------------------------------------------------------------------
# Startup: reload all active configs
# ---------------------------------------------------------------------------

def _prune_runs(session: Session, config_id: uuid.UUID, keep: int = 5) -> None:
    """Delete all but the most recent `keep` runs for a given scheduler config."""
    to_delete = session.exec(
        select(SchedulerRun)
        .where(SchedulerRun.scheduler_config_id == config_id)
        .order_by(col(SchedulerRun.started_at).desc())
        .offset(keep)
    ).all()
    for run in to_delete:
        session.delete(run)
    if to_delete:
        session.commit()


def load_active_schedulers() -> None:
    """Called on FastAPI startup to restore all active, non-paused scheduler jobs."""
    with Session(engine) as session:
        configs = session.exec(
            select(SchedulerConfig).where(
                SchedulerConfig.is_active == True,  # noqa: E712
                SchedulerConfig.is_paused == False,  # noqa: E712
            )
        ).all()
        for config in configs:
            _schedule_job(config)

        # Mark any orphaned RUNNING runs as FAILED (from previous crashed deploys)
        orphaned = session.exec(
            select(SchedulerRun).where(SchedulerRun.status == SchedulerRunStatus.RUNNING)
        ).all()
        for orphan in orphaned:
            orphan.status = SchedulerRunStatus.FAILED
            orphan.finished_at = datetime.now(timezone.utc)
            orphan.error_message = "Server restarted before run completed"
            session.add(orphan)
        if orphaned:
            session.commit()

        # Prune to last 5 runs per config
        all_configs = session.exec(select(SchedulerConfig)).all()
        for cfg in all_configs:
            _prune_runs(session, cfg.id)

    logger.info("Loaded %s active scheduler(s) on startup.", len(configs))

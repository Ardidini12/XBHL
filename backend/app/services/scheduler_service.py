import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select

from app.core.db import engine
from app.models import (
    Club,
    ClubSeasonRelationship,
    Match,
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
    """
    Get the module's shared AsyncIOScheduler instance.
    
    Returns:
        scheduler (AsyncIOScheduler): The global scheduler used to schedule and manage jobs.
    """
    return _scheduler


def _job_id(season_id: uuid.UUID) -> str:
    """
    Builds a deterministic APScheduler job identifier for a season.
    
    Returns:
        A string in the form "season_<season_uuid>" representing the job ID.
    """
    return f"season_{season_id}"


# ---------------------------------------------------------------------------
# Core fetch job
# ---------------------------------------------------------------------------

async def _run_fetch_job(season_id_str: str) -> None:
    """
    Execute a scheduled fetch of EA matches for every club in the given season.
    
    Runs a single scheduler cycle: validates the SchedulerConfig for the season (active, not paused, within configured days/hours), creates a SchedulerRun audit record, resolves/updates club EA IDs, fetches matches from the EA API, and persists new Match records. On completion the SchedulerRun is updated with finished timestamp, totals (matches_fetched, matches_new), status (SUCCESS or FAILED), and an optional error_message.
    
    Parameters:
        season_id_str (str): Season UUID as a string (provided by APScheduler).
    """
    season_id = uuid.UUID(season_id_str)

    with Session(engine) as session:
        config = session.exec(
            select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
        ).first()

        if not config or not config.is_active or config.is_paused:
            logger.info("Scheduler for season %s is inactive/paused — skipping.", season_id)
            return

        # Check hour window
        now_utc = datetime.now(timezone.utc)
        current_hour = now_utc.hour
        current_dow = now_utc.weekday()  # 0=Mon, 6=Sun

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


def _store_match(
    session: Session,
    raw: dict[str, Any],
    season_id: uuid.UUID,
    club_id: uuid.UUID,
) -> int:
    """
    Insert a Match record from a raw EA match payload if it is not already stored.
    
    If the payload lacks an `matchId` or `timestamp`, the function skips insertion. Deduplication is performed using the combination of `ea_match_id`, `ea_timestamp`, and the provided `club_id`.
    
    Parameters:
        raw (dict[str, Any]): Raw EA match dictionary; expected keys include `"matchId"`, `"timestamp"`, and `"clubs"` where `"clubs"` is a mapping of club EA IDs to per-club data containing `"teamSide"` and `"score"`.
    
    Returns:
        int: `1` if a new Match was inserted, `0` if the match was skipped or a duplicate.
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
        return 1
    except Exception:
        session.rollback()
        return 0


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

def _schedule_job(config: SchedulerConfig) -> None:
    """
    Create or replace the periodic APScheduler job that runs fetches for the config's season.
    
    Schedules a job using the config's interval_minutes and stores the job id in the in-memory registry keyed by the season id.
    
    Parameters:
        config (SchedulerConfig): Scheduler configuration for a season; its `season_id` is used to name the job and `interval_minutes` determines the job interval.
    """
    jid = _job_id(config.season_id)
    season_id_str = str(config.season_id)

    if _scheduler.get_job(jid):
        _scheduler.remove_job(jid)

    _scheduler.add_job(
        _run_fetch_job,
        trigger=IntervalTrigger(minutes=config.interval_minutes),
        id=jid,
        args=[season_id_str],
        replace_existing=True,
        misfire_grace_time=60,
    )
    _job_registry[season_id_str] = jid
    logger.info("Scheduled job for season %s every %s min.", config.season_id, config.interval_minutes)


def start_scheduler(config: SchedulerConfig) -> None:
    """
    Activate the given scheduler configuration, clear its paused state, persist the update, and schedule its job.
    
    Parameters:
        config (SchedulerConfig): Scheduler configuration to activate and schedule.
    """
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
    """
    Stop the scheduler for a season and mark its SchedulerConfig inactive while keeping the config record.
    
    Removes any scheduled APScheduler job for the given season and updates the corresponding SchedulerConfig to set is_active = False and is_paused = False, updating the config's timestamp.
    
    Parameters:
        season_id (uuid.UUID): ID of the season whose scheduler should be stopped.
    """
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
    """
    Pause the scheduler job for a season.
    
    Sets the SchedulerConfig.is_paused flag to True and leaves the scheduled job registered (future runs will be skipped by the job's runtime checks).
    
    Parameters:
        season_id (uuid.UUID): UUID of the season whose scheduler job should be paused.
    """
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
    """
    Resume and ensure scheduling for the job associated with the given season.
    
    If an APScheduler job exists for the season, resume it; if the job was removed, re-create it from the stored SchedulerConfig. Updates the SchedulerConfig to set `is_paused = False`, `is_active = True`, and refreshes `updated_at` to the current UTC time.
    
    Parameters:
        season_id (uuid.UUID): UUID of the season whose scheduler should be resumed.
    """
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
    """
    Stop the scheduler for a season and remove its configuration and runs from the database.
    
    Parameters:
        season_id (uuid.UUID): UUID of the season whose scheduler and associated records should be removed.
    """
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
    """
    Restart the scheduler for the season described by `config`.
    
    Stops any existing job for `config.season_id` and schedules a new job using the provided SchedulerConfig.
    
    Parameters:
        config (SchedulerConfig): Configuration containing the season_id and scheduling settings to apply.
    """
    stop_scheduler(config.season_id)
    start_scheduler(config)


def is_job_running(season_id: uuid.UUID) -> bool:
    """
    Determine whether a scheduler job for the given season has a next run scheduled.
    
    Returns:
        True if a job exists for the season and has a scheduled `next_run_time`, False otherwise.
    """
    jid = _job_id(season_id)
    job = _scheduler.get_job(jid)
    return job is not None and not getattr(job, "next_run_time", None) is None


# ---------------------------------------------------------------------------
# Startup: reload all active configs
# ---------------------------------------------------------------------------

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
    logger.info("Loaded %s active scheduler(s) on startup.", len(configs))

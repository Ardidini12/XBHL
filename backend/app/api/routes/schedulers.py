import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    League,
    Match,
    Message,
    SchedulerConfig,
    SchedulerConfigCreate,
    SchedulerConfigPublic,
    SchedulerConfigUpdate,
    SchedulerConfigWithStatus,
    SchedulerRun,
    SchedulerRunsPublic,
    Season,
)
from app.services import scheduler_service

router = APIRouter(tags=["schedulers"])


def _enrich_config(
    config: SchedulerConfig, session: Session
) -> SchedulerConfigWithStatus:
    season = session.get(Season, config.season_id)
    league = session.get(League, season.league_id) if season else None

    last_run = session.exec(
        select(SchedulerRun)
        .where(SchedulerRun.scheduler_config_id == config.id)
        .order_by(col(SchedulerRun.started_at).desc())
        .limit(1)
    ).first()

    total_matches = session.exec(
        select(func.count())
        .select_from(Match)
        .where(Match.season_id == config.season_id)
    ).one()

    return SchedulerConfigWithStatus(
        id=config.id,
        season_id=config.season_id,
        is_active=config.is_active,
        is_paused=config.is_paused,
        days_of_week=config.days_of_week or [],
        start_hour=config.start_hour,
        end_hour=config.end_hour,
        interval_minutes=config.interval_minutes,
        created_at=config.created_at,
        updated_at=config.updated_at,
        season_name=season.name if season else None,
        league_name=league.name if league else None,
        last_run_at=last_run.started_at if last_run else None,
        last_run_status=last_run.status.value if last_run else None,
        total_matches=total_matches,
        is_running=scheduler_service.is_job_running(config.season_id),
    )


# ---------------------------------------------------------------------------
# Global schedulers list
# ---------------------------------------------------------------------------

@router.get(
    "/schedulers/",
    response_model=list[SchedulerConfigWithStatus],
    dependencies=[Depends(get_current_active_superuser)],
)
def list_all_schedulers(session: SessionDep) -> list[SchedulerConfigWithStatus]:
    configs = session.exec(select(SchedulerConfig)).all()
    return [_enrich_config(c, session) for c in configs]


# ---------------------------------------------------------------------------
# Season-scoped scheduler endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/seasons/{season_id}/scheduler",
    response_model=SchedulerConfigWithStatus,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scheduler(season_id: uuid.UUID, session: SessionDep) -> SchedulerConfigWithStatus:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found for this season.")
    return _enrich_config(config, session)


@router.post(
    "/seasons/{season_id}/scheduler",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def create_scheduler(
    season_id: uuid.UUID,
    payload: SchedulerConfigCreate,
    session: SessionDep,
) -> SchedulerConfigPublic:
    season = session.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found.")

    existing = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Scheduler already exists for this season. Use PATCH to update.")

    config = SchedulerConfig(
        season_id=season_id,
        days_of_week=payload.days_of_week,
        start_hour=payload.start_hour,
        end_hour=payload.end_hour,
        interval_minutes=payload.interval_minutes,
    )
    session.add(config)
    session.commit()
    session.refresh(config)
    return SchedulerConfigPublic.model_validate(config)


@router.patch(
    "/seasons/{season_id}/scheduler",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def update_scheduler(
    season_id: uuid.UUID,
    payload: SchedulerConfigUpdate,
    session: SessionDep,
) -> SchedulerConfigPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")

    update_data = payload.model_dump(exclude_unset=True)
    config.sqlmodel_update(update_data)
    config.updated_at = datetime.now(timezone.utc)
    session.add(config)
    session.commit()
    session.refresh(config)

    # Restart job if it was active
    if config.is_active and not config.is_paused:
        scheduler_service.restart_scheduler(config)

    return SchedulerConfigPublic.model_validate(config)


@router.delete(
    "/seasons/{season_id}/scheduler",
    response_model=Message,
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_scheduler(season_id: uuid.UUID, session: SessionDep) -> Message:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")
    scheduler_service.delete_scheduler(season_id)
    return Message(message="Scheduler deleted.")


@router.post(
    "/seasons/{season_id}/scheduler/start",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def start_scheduler(season_id: uuid.UUID, session: SessionDep) -> SchedulerConfigPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")
    scheduler_service.start_scheduler(config)
    session.refresh(config)
    return SchedulerConfigPublic.model_validate(config)


@router.post(
    "/seasons/{season_id}/scheduler/stop",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def stop_scheduler(season_id: uuid.UUID, session: SessionDep) -> SchedulerConfigPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")
    scheduler_service.stop_scheduler(season_id)
    session.refresh(config)
    return SchedulerConfigPublic.model_validate(config)


@router.post(
    "/seasons/{season_id}/scheduler/pause",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def pause_scheduler(season_id: uuid.UUID, session: SessionDep) -> SchedulerConfigPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")
    if not config.is_active:
        raise HTTPException(status_code=400, detail="Scheduler is not running.")
    scheduler_service.pause_scheduler(season_id)
    session.refresh(config)
    return SchedulerConfigPublic.model_validate(config)


@router.post(
    "/seasons/{season_id}/scheduler/resume",
    response_model=SchedulerConfigPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def resume_scheduler(season_id: uuid.UUID, session: SessionDep) -> SchedulerConfigPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")
    scheduler_service.resume_scheduler(season_id)
    session.refresh(config)
    return SchedulerConfigPublic.model_validate(config)


@router.get(
    "/seasons/{season_id}/scheduler/runs",
    response_model=SchedulerRunsPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_scheduler_runs(
    season_id: uuid.UUID,
    session: SessionDep,
    skip: int = 0,
    limit: int = 50,
) -> SchedulerRunsPublic:
    config = session.exec(
        select(SchedulerConfig).where(SchedulerConfig.season_id == season_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found.")

    count = session.exec(
        select(func.count())
        .select_from(SchedulerRun)
        .where(SchedulerRun.scheduler_config_id == config.id)
    ).one()
    runs = session.exec(
        select(SchedulerRun)
        .where(SchedulerRun.scheduler_config_id == config.id)
        .order_by(col(SchedulerRun.started_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return SchedulerRunsPublic(data=list(runs), count=count)

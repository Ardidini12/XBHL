import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException


from app import crud
from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Message,
    League,
    Season,
    SeasonCreate,
    SeasonUpdate,
    SeasonPublic,
    SeasonsPublic,
)

router = APIRouter(prefix="/leagues/{league_id}/seasons", tags=["seasons"])


def get_league_or_404(league_id: uuid.UUID, session: SessionDep) -> League:
    league = session.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


def get_season_or_404(season_id: uuid.UUID, league_id: uuid.UUID, session: SessionDep) -> Season:
    season = crud.get_season_by_id(session=session, season_id=season_id)
    if not season or season.league_id != league_id:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=SeasonPublic,
)
def create_season(
    *, session: SessionDep, league_id: uuid.UUID, season_in: SeasonCreate
) -> Any:
    """
    Create a new season for a league. start_date is set automatically.
    """
    get_league_or_404(league_id=league_id, session=session)

    # Force league_id from the URL path (ignore whatever the body sends)
    payload = SeasonCreate(name=season_in.name, league_id=league_id)
    season = crud.create_season(session=session, season_create=payload)
    return season


@router.get(
    "/",
    response_model=SeasonsPublic,
)
def read_seasons(
    session: SessionDep, league_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """
    List all seasons for a league.
    """
    get_league_or_404(league_id=league_id, session=session)
    seasons, count = crud.get_seasons_by_league(
        session=session, league_id=league_id, skip=skip, limit=limit
    )
    return SeasonsPublic(data=seasons, count=count)


@router.get(
    "/{season_id}",
    response_model=SeasonPublic,
)
def read_season(
    *, session: SessionDep, league_id: uuid.UUID, season_id: uuid.UUID
) -> Any:
    """
    Get a specific season by id.
    """
    return get_season_or_404(season_id=season_id, league_id=league_id, session=session)


@router.patch(
    "/{season_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=SeasonPublic,
)
def update_season(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    season_in: SeasonUpdate,
) -> Any:
    """
    Update a season's name.
    """
    db_season = get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    return crud.update_season(session=session, db_season=db_season, season_in=season_in)


@router.patch(
    "/{season_id}/end",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=SeasonPublic,
)
def end_season(
    *, session: SessionDep, league_id: uuid.UUID, season_id: uuid.UUID
) -> Any:
    """
    End a season — sets end_date to the current UTC time.
    """
    db_season = get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    if db_season.end_date is not None:
        raise HTTPException(status_code=400, detail="Season has already ended")
    return crud.end_season(session=session, db_season=db_season)


@router.delete(
    "/{season_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_season(
    *, session: SessionDep, league_id: uuid.UUID, season_id: uuid.UUID
) -> Message:
    """
    Delete a season.
    """
    db_season = get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    session.delete(db_season)
    session.commit()
    return Message(message="Season deleted successfully")

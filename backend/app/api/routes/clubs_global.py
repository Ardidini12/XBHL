import uuid
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Club,
    ClubCreate,
    ClubPublic,
    ClubsPublic,
    ClubUpdate,
    Message,
    Season,
)

NY_TZ = ZoneInfo("America/New_York")

router = APIRouter(prefix="/clubs", tags=["clubs"])


def get_club_or_404(club_id: uuid.UUID, session: SessionDep) -> Club:
    club = crud.get_club_by_id(session=session, club_id=club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.get("/", response_model=ClubsPublic)
def read_all_clubs(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    List all clubs on the platform (across all leagues/seasons).
    """
    clubs, count = crud.get_all_clubs(session=session, skip=skip, limit=limit)
    return ClubsPublic(data=clubs, count=count)


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def create_standalone_club(
    *,
    session: SessionDep,
    club_in: ClubCreate,
) -> Any:
    """
    Create a new club without assigning it to any season.
    Club name must be unique across the platform.
    """
    existing = crud.get_club_by_name(session=session, name=club_in.name)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A club named '{club_in.name}' already exists.",
        )
    club = crud.create_club(session=session, club_create=club_in)
    return crud.build_club_public(session=session, club=club)


@router.get("/{club_id}", response_model=ClubPublic)
def read_club(
    *,
    session: SessionDep,
    club_id: uuid.UUID,
) -> Any:
    """
    Get a single club by ID with full season history.
    """
    club = get_club_or_404(club_id=club_id, session=session)
    return crud.build_club_public(session=session, club=club)


@router.patch(
    "/{club_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def update_club_global(
    *,
    session: SessionDep,
    club_id: uuid.UUID,
    club_in: ClubUpdate,
) -> Any:
    """
    Update a club's details from the global clubs page.
    """
    db_club = get_club_or_404(club_id=club_id, session=session)
    if club_in.name is not None:
        if club_in.name == "":
            raise HTTPException(status_code=400, detail="Club name cannot be empty.")
        if club_in.name != db_club.name:
            conflict = crud.get_club_by_name(session=session, name=club_in.name)
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=f"A club named '{club_in.name}' already exists.",
                )
    updated = crud.update_club(session=session, db_club=db_club, club_in=club_in)
    return crud.build_club_public(session=session, club=updated)


@router.delete(
    "/{club_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def delete_club_global(
    *,
    session: SessionDep,
    club_id: uuid.UUID,
) -> Message:
    """
    Permanently delete a club from the platform (removes all season memberships).
    """
    db_club = get_club_or_404(club_id=club_id, session=session)
    crud.delete_club(session=session, db_club=db_club)
    return Message(message="Club deleted")


@router.post(
    "/{club_id}/assign",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def assign_club_to_season(
    *,
    session: SessionDep,
    club_id: uuid.UUID,
    season_id: uuid.UUID,
) -> Any:
    """
    Assign an existing club to a season.
    """
    db_club = get_club_or_404(club_id=club_id, session=session)
    season = session.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    if season.end_date is not None and season.end_date <= datetime.now(NY_TZ):
        raise HTTPException(status_code=409, detail="Season is closed and no longer accepting clubs.")
    crud.add_club_to_season(session=session, club_id=club_id, season_id=season_id)
    return crud.build_club_public(session=session, club=db_club)

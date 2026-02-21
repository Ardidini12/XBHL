import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Club,
    ClubCreate,
    ClubPublic,
    ClubsPublic,
    ClubSeasonRelationship,
    ClubUpdate,
    League,
    Message,
    Season,
)

router = APIRouter(
    prefix="/leagues/{league_id}/seasons/{season_id}/clubs",
    tags=["clubs"],
)


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


def get_club_in_season_or_404(
    club_id: uuid.UUID, season_id: uuid.UUID, session: SessionDep
) -> Club:
    club = crud.get_club_by_id(session=session, club_id=club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    link = session.exec(
        select(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.club_id == club_id)
        .where(ClubSeasonRelationship.season_id == season_id)
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Club not in this season")
    return club


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def create_club_in_season(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    club_in: ClubCreate,
) -> Any:
    """
    Create a new club and add it to the season.
    Club name must be unique — returns 409 if name already exists.
    """
    get_league_or_404(league_id=league_id, session=session)
    season = get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    club = crud.get_club_by_name(session=session, name=club_in.name)
    if club is not None:
        raise HTTPException(
            status_code=409,
            detail=f"A club named '{club_in.name}' already exists. Use 'Add from Existing' to assign it to this season.",
        )
    club = crud.create_club(session=session, club_create=club_in)
    crud.add_club_to_season(session=session, club_id=club.id, season_id=season.id)
    season_count = crud._get_season_count(session=session, club_id=club.id)
    history = crud.get_club_season_history(session=session, club_id=club.id)
    return ClubPublic(
        id=club.id,
        name=club.name,
        ea_id=club.ea_id,
        logo_url=club.logo_url,
        created_at=club.created_at,
        updated_at=club.updated_at,
        season_count=season_count,
        history=history,
    )


@router.post(
    "/assign/{club_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def assign_existing_club_to_season(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    club_id: uuid.UUID,
) -> Any:
    """
    Assign an existing platform club to this season.
    """
    get_league_or_404(league_id=league_id, session=session)
    season = get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    club = crud.get_club_by_id(session=session, club_id=club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    crud.add_club_to_season(session=session, club_id=club.id, season_id=season.id)
    season_count = crud._get_season_count(session=session, club_id=club.id)
    history = crud.get_club_season_history(session=session, club_id=club.id)
    return ClubPublic(
        id=club.id,
        name=club.name,
        ea_id=club.ea_id,
        logo_url=club.logo_url,
        created_at=club.created_at,
        updated_at=club.updated_at,
        season_count=season_count,
        history=history,
    )


@router.get(
    "/",
    response_model=ClubsPublic,
)
def read_clubs_in_season(
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    List all clubs in a season. Intentionally public — no auth required.
    """
    get_league_or_404(league_id=league_id, session=session)
    get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    clubs, count = crud.get_clubs_by_season(
        session=session, season_id=season_id, skip=skip, limit=limit
    )
    return ClubsPublic(data=clubs, count=count)


@router.patch(
    "/{club_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ClubPublic,
)
def update_club(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    club_id: uuid.UUID,
    club_in: ClubUpdate,
) -> Any:
    """
    Update a club's name, EA ID, or logo URL.
    """
    get_league_or_404(league_id=league_id, session=session)
    get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    db_club = get_club_in_season_or_404(club_id=club_id, season_id=season_id, session=session)
    if club_in.name and club_in.name != db_club.name:
        conflict = crud.get_club_by_name(session=session, name=club_in.name)
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"A club named '{club_in.name}' already exists.",
            )
    updated = crud.update_club(session=session, db_club=db_club, club_in=club_in)
    season_count = crud._get_season_count(session=session, club_id=updated.id)
    history = crud.get_club_season_history(session=session, club_id=updated.id)
    return ClubPublic(
        id=updated.id,
        name=updated.name,
        ea_id=updated.ea_id,
        logo_url=updated.logo_url,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        season_count=season_count,
        history=history,
    )


@router.delete(
    "/{club_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def remove_club_from_season(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    season_id: uuid.UUID,
    club_id: uuid.UUID,
) -> Message:
    """
    Remove a club from this season. The club record is preserved if it belongs to other seasons.
    """
    get_league_or_404(league_id=league_id, session=session)
    get_season_or_404(season_id=season_id, league_id=league_id, session=session)
    get_club_in_season_or_404(club_id=club_id, season_id=season_id, session=session)
    crud.remove_club_from_season(session=session, club_id=club_id, season_id=season_id)
    return Message(message="Club removed from season")

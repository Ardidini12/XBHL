import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import col, delete, func, select

from app import crud
from app.api.deps import (
    SessionDep,
    get_current_active_superuser,
)
from app.models import (
    Message,
    League,
    LeagueCreate,
    LeagueUpdate,
    LeaguePublic,
    LeaguesPublic,
)

router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.post(
 "/", dependencies=[Depends(get_current_active_superuser)],response_model=LeaguePublic
 )
def create_league(*, session: SessionDep, league_in: LeagueCreate) -> League:
    """
    Create a new league.
    """
    league = crud.get_league_by_name(session=session, name=league_in.name)
    if league:
        raise HTTPException(
            status_code=400,
            detail="The League with this name already exists in the system.",
        )

    league = crud.create_league(session=session, league_create=league_in)
    return league


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=LeaguesPublic,
)
def read_leagues(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve leagues.
    """

    count_statement = select(func.count()).select_from(League)
    count = session.exec(count_statement).one()

    statement = (
        select(League).order_by(col(League.created_at).desc()).offset(skip).limit(limit)
    )
    leagues = session.exec(statement).all()

    return LeaguesPublic(data=leagues, count=count)


@router.get("/{league_id}", response_model=LeaguePublic)
def read_league_by_id(
    league_id: uuid.UUID, session: SessionDep 
) -> Any:
    """
    Get a specific league by id.
    """
    league = session.get(League, league_id)
    if league is None:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@router.patch(
    "/{league_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=LeaguePublic,
)
def update_league(
    *,
    session: SessionDep,
    league_id: uuid.UUID,
    league_in: LeagueUpdate,
) -> Any:
    """
    Update a league.
    """

    db_league = session.get(League, league_id)
    if not db_league:
        raise HTTPException(
            status_code=404,
            detail="The league with this id does not exist in the system",
        )
    if league_in.name:
        existing_league = crud.get_league_by_name(session=session, name=league_in.name)
        if existing_league and existing_league.id != league_id:
            raise HTTPException(
                status_code=409, detail="League with this name already exists"
            )

    db_league = crud.update_league(session=session, db_league=db_league, league_in=league_in)
    return db_league


@router.delete("/{league_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_league(
    session: SessionDep, league_id: uuid.UUID
) -> Message:
    """
    Delete a league.
    """
    league = session.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    session.delete(league)
    session.commit()
    return Message(message="League deleted successfully")

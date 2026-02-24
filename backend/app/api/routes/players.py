import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Player,
    PlayerDetailPublic,
    PlayerMatchStats,
    PlayerMatchStatsPublic,
    PlayersPublic,
    PlayerPublic,
)

router = APIRouter(tags=["players"])


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
def get_player(ea_player_id: str, session: SessionDep) -> PlayerDetailPublic:
    player = session.exec(
        select(Player).where(Player.ea_player_id == ea_player_id)
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found.")

    stats = session.exec(
        select(PlayerMatchStats)
        .where(PlayerMatchStats.ea_player_id == ea_player_id)
        .order_by(col(PlayerMatchStats.ea_timestamp).desc())
    ).all()

    return PlayerDetailPublic(
        id=player.id,
        ea_player_id=player.ea_player_id,
        gamertag=player.gamertag,
        created_at=player.created_at,
        updated_at=player.updated_at,
        stats=[PlayerMatchStatsPublic.model_validate(s) for s in stats],
    )

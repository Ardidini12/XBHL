import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.models import (
    Club,
    ClubSeasonRelationship,
    League,
    Match,
    MatchWithContext,
    MatchesPublic,
    Season,
)

router = APIRouter(tags=["matches"])


def _enrich_match(match: Match, session: Session, requesting_club_id: uuid.UUID) -> MatchWithContext:
    season = session.get(Season, match.season_id)
    league = session.get(League, season.league_id) if season else None

    club = session.get(Club, requesting_club_id)
    club_ea_id = club.ea_id if club else None

    is_home: bool | None = None
    opponent_ea_id: str | None = None

    if club_ea_id and match.home_club_ea_id and match.away_club_ea_id:
        if club_ea_id == match.home_club_ea_id:
            is_home = True
            opponent_ea_id = match.away_club_ea_id
        elif club_ea_id == match.away_club_ea_id:
            is_home = False
            opponent_ea_id = match.home_club_ea_id

    return MatchWithContext(
        id=match.id,
        ea_match_id=match.ea_match_id,
        ea_timestamp=match.ea_timestamp,
        season_id=match.season_id,
        club_id=match.club_id,
        home_club_ea_id=match.home_club_ea_id,
        away_club_ea_id=match.away_club_ea_id,
        home_score=match.home_score,
        away_score=match.away_score,
        created_at=match.created_at,
        season_name=season.name if season else None,
        league_name=league.name if league else None,
        is_home=is_home,
        opponent_ea_id=opponent_ea_id,
    )


@router.get(
    "/matches/",
    response_model=MatchesPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_all_matches(
    session: SessionDep,
    skip: int = 0,
    limit: int = 50,
    season_id: Optional[uuid.UUID] = None,
    club_id: Optional[uuid.UUID] = None,
    league_id: Optional[uuid.UUID] = None,
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
        data=[_enrich_match(m, session, m.club_id) for m in matches],
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
        data=[_enrich_match(m, session, club_id) for m in matches],
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
        data=[_enrich_match(m, session, m.club_id) for m in matches],
        count=count,
    )

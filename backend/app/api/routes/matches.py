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


def _enrich_match(match: Match, session: Session, requesting_club_id: uuid.UUID) -> MatchWithContext:
    """
    Builds a MatchWithContext combining core match data with season/league names and opponent context for a requesting club.
    
    Parameters:
        match (Match): The Match record to enrich.
        session (Session): Database session used to load related Season, League, and Club.
        requesting_club_id (uuid.UUID): ID of the club used to determine home/away status and opponent EA id.
    
    Returns:
        MatchWithContext: An object containing the match's core fields (id, ea_match_id, ea_timestamp, season_id, club_id,
        home_club_ea_id, away_club_ea_id, home_score, away_score, created_at) plus:
          - season_name: season.name if the season exists, otherwise None
          - league_name: league.name if the league exists, otherwise None
          - is_home: True if the requesting club is the home team, False if the away team, None if undeterminable
          - opponent_ea_id: EA id of the opposing club when determinable, otherwise None
    """
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
    """
    Retrieve paginated matches for a club enriched with season and league context.
    
    Parameters:
    	club_id (uuid.UUID): ID of the club whose matches will be returned.
    	skip (int): Number of items to skip for pagination.
    	limit (int): Maximum number of items to return.
    
    Returns:
    	MatchesPublic: An object with `data` containing a list of MatchWithContext entries (matches enriched with season_name, league_name, is_home, and opponent_ea_id) and `count` containing the total number of matches for the club.
    
    Raises:
    	HTTPException: Raised with status code 404 if the club is not found.
    """
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
    """
    Retrieve paginated matches for a season enriched with contextual data.
    
    Parameters:
        season_id (uuid.UUID): UUID of the season whose matches should be retrieved.
        skip (int): Number of records to skip for pagination.
        limit (int): Maximum number of records to return.
    
    Returns:
        MatchesPublic: An object containing `data` (list of enriched matches with season and league context, home/away flag, and opponent EA ID) and `count` (total number of matches for the season).
    
    Raises:
        HTTPException: 404 if the specified season does not exist.
    """
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

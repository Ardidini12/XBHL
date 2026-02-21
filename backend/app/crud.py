import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    User, UserCreate, UserUpdate,
    League, LeagueCreate, LeagueUpdate,
    Season, SeasonCreate, SeasonUpdate,
    Club, ClubCreate, ClubUpdate, ClubPublic,
    ClubSeasonRelationship, ClubSeasonHistory,
)


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user

def get_user_by_gamertag(*, session: Session, gamertag: str) -> User | None:
    statement = select(User).where(User.gamertag == gamertag)
    session_user = session.exec(statement).first()
    return session_user

# Dummy hash to use for timing attack prevention when user is not found
# This is an Argon2 hash of a random password, used to ensure constant-time comparison
DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def authenticate(*, session: Session, email_or_gamertag: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email_or_gamertag)
    if not db_user:
        db_user = get_user_by_gamertag(session=session, gamertag=email_or_gamertag)
    if not db_user:
        # Prevent timing attacks by running password verification even when user doesn't exist
        # This ensures the response time is similar whether or not the email exists
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_password_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_password_hash:
        db_user.hashed_password = updated_password_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


#League CRUD

def get_league_by_name(*, session: Session, name: str) -> League | None:
    statement = select(League).where(League.name == name)
    session_league = session.exec(statement).first()
    return session_league


def create_league(*, session: Session, league_create: LeagueCreate) -> League:
    db_obj = League.model_validate(league_create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_league(*, session: Session, db_league: League, league_in: LeagueUpdate) -> League:
    league_data = league_in.model_dump(exclude_unset=True)
    db_league.sqlmodel_update(league_data)
    session.add(db_league)
    session.commit()
    session.refresh(db_league)
    return db_league


# Season CRUD

def create_season(*, session: Session, season_create: SeasonCreate) -> Season:
    db_obj = Season.model_validate(season_create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_seasons_by_league(
    *, session: Session, league_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> tuple[list[Season], int]:
    count = session.exec(
        select(func.count()).select_from(Season).where(Season.league_id == league_id)
    ).one()
    seasons = session.exec(
        select(Season)
        .where(Season.league_id == league_id)
        .order_by(col(Season.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return list(seasons), count


def get_season_by_id(*, session: Session, season_id: uuid.UUID) -> Season | None:
    return session.get(Season, season_id)


def end_season(*, session: Session, db_season: Season) -> Season:
    db_season.end_date = datetime.now(timezone.utc)
    db_season.updated_at = datetime.now(timezone.utc)
    session.add(db_season)
    session.commit()
    session.refresh(db_season)
    return db_season


def update_season(*, session: Session, db_season: Season, season_in: SeasonUpdate) -> Season:
    season_data = season_in.model_dump(exclude_unset=True)
    db_season.sqlmodel_update(season_data)
    db_season.updated_at = datetime.now(timezone.utc)
    session.add(db_season)
    session.commit()
    session.refresh(db_season)
    return db_season


# Club CRUD

def create_club(*, session: Session, club_create: ClubCreate) -> Club:
    db_obj = Club.model_validate(club_create)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_club_by_id(*, session: Session, club_id: uuid.UUID) -> Club | None:
    return session.get(Club, club_id)


def get_club_by_name(*, session: Session, name: str) -> Club | None:
    return session.exec(select(Club).where(Club.name == name)).first()


def get_season_count(*, session: Session, club_id: uuid.UUID) -> int:
    return session.exec(
        select(func.count())
        .select_from(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.club_id == club_id)
    ).one()


def _get_season_count(*, session: Session, club_id: uuid.UUID) -> int:
    return get_season_count(session=session, club_id=club_id)


def get_clubs_by_season(
    *, session: Session, season_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> tuple[list[ClubPublic], int]:
    count = session.exec(
        select(func.count())
        .select_from(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.season_id == season_id)
    ).one()
    links = session.exec(
        select(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.season_id == season_id)
        .offset(skip)
        .limit(limit)
    ).all()
    result: list[ClubPublic] = []
    for link in links:
        club = session.get(Club, link.club_id)
        if club:
            result.append(build_club_public(session=session, club=club))
    return result, count


def add_club_to_season(
    *, session: Session, club_id: uuid.UUID, season_id: uuid.UUID
) -> None:
    existing = session.exec(
        select(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.club_id == club_id)
        .where(ClubSeasonRelationship.season_id == season_id)
    ).first()
    if existing:
        return
    link = ClubSeasonRelationship(club_id=club_id, season_id=season_id)
    session.add(link)
    session.commit()


def remove_club_from_season(
    *, session: Session, club_id: uuid.UUID, season_id: uuid.UUID
) -> None:
    link = session.exec(
        select(ClubSeasonRelationship)
        .where(ClubSeasonRelationship.club_id == club_id)
        .where(ClubSeasonRelationship.season_id == season_id)
    ).first()
    if link:
        session.delete(link)
        session.commit()


def update_club(*, session: Session, db_club: Club, club_in: ClubUpdate) -> Club:
    club_data = club_in.model_dump(exclude_unset=True)
    db_club.sqlmodel_update(club_data)
    db_club.updated_at = datetime.now(timezone.utc)
    session.add(db_club)
    session.commit()
    session.refresh(db_club)
    return db_club


def delete_club(*, session: Session, db_club: Club) -> None:
    session.delete(db_club)
    session.commit()


def build_club_public(*, session: Session, club: Club) -> ClubPublic:
    sc = get_season_count(session=session, club_id=club.id)
    history = _build_history(session=session, club_id=club.id)
    return ClubPublic(
        id=club.id,
        name=club.name,
        ea_id=club.ea_id,
        logo_url=club.logo_url,
        created_at=club.created_at,
        updated_at=club.updated_at,
        season_count=sc,
        history=history,
    )


def _build_history(*, session: Session, club_id: uuid.UUID) -> list[ClubSeasonHistory]:
    links = session.exec(
        select(ClubSeasonRelationship).where(ClubSeasonRelationship.club_id == club_id)
    ).all()
    history: list[ClubSeasonHistory] = []
    for link in links:
        season = session.get(Season, link.season_id)
        if season:
            league = session.get(League, season.league_id)
            history.append(
                ClubSeasonHistory(
                    season_id=str(season.id),
                    season_name=season.name,
                    league_id=str(season.league_id),
                    league_name=league.name if league else "Unknown",
                )
            )
    return history


def get_all_clubs(
    *, session: Session, skip: int = 0, limit: int = 100
) -> tuple[list[ClubPublic], int]:
    count = session.exec(select(func.count()).select_from(Club)).one()
    clubs = session.exec(
        select(Club).order_by(col(Club.name)).offset(skip).limit(limit)
    ).all()
    result: list[ClubPublic] = []
    for club in clubs:
        result.append(build_club_public(session=session, club=club))
    return result, count


def get_club_season_history(
    *, session: Session, club_id: uuid.UUID
) -> list[ClubSeasonHistory]:
    return _build_history(session=session, club_id=club_id)
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    User, UserCreate, UserUpdate,
    League, LeagueCreate, LeagueUpdate,
    Season, SeasonCreate, SeasonUpdate,
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
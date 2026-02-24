import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from zoneinfo import ZoneInfo

from pydantic import EmailStr, model_validator
from sqlalchemy import DateTime, JSON, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

NY_TZ = ZoneInfo("America/New_York")


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    gamertag: str = Field(unique=True, index=True, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):   
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    gamertag: str = Field(unique=True, index=True, max_length=255) 

# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)
    gamertag: str | None = Field(default=None, max_length=255)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    gamertag: str | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


#Leagues Model

class LeagueType(str, Enum):
    THREE_V_THREE = "3v3"
    SIX_V_SIX = "6v6"

#Base Class
class LeagueBase(SQLModel):
    name: str = Field(unique=True, index=True, max_length=255)
    league_type: LeagueType
    is_active: bool = True
    description: str | None = Field(default=None)

# Properties to receive via API on creation
class LeagueCreate(LeagueBase):
    pass


# Properties to receive via API on update, all are optional
class LeagueUpdate(LeagueBase):
    name: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)
    league_type: LeagueType | None = Field(default=None)
    description: str | None = Field(default=None)

# Database model, database table inferred from class name
class League(LeagueBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    seasons: list["Season"] = Relationship(back_populates="league")
    

# Properties to return via API, id is always required
class LeaguePublic(LeagueBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

#Contains list of Leagues and count
class LeaguesPublic(SQLModel):
    data: list[LeaguePublic]
    count: int


#Season Model
class SeasonBase(SQLModel):
    name: str = Field(max_length=255)
    league_id: uuid.UUID = Field(foreign_key="league.id", ondelete="CASCADE")

class SeasonCreate(SeasonBase):
    pass  

class SeasonUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)

class Season(SeasonBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    start_date: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    end_date: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    league: League = Relationship(back_populates="seasons")
    club_links: list["ClubSeasonRelationship"] = Relationship(back_populates="season")

class SeasonPublic(SeasonBase):
    id: uuid.UUID
    start_date: datetime
    end_date: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

class SeasonsPublic(SQLModel):
    data: list[SeasonPublic]
    count: int


# Club Model

class ClubSeasonHistory(SQLModel):
    season_id: str
    season_name: str
    league_id: str
    league_name: str
    is_active: bool = True
    start_date: datetime | None = None
    end_date: datetime | None = None


class ClubBase(SQLModel):
    name: str = Field(unique=True, index=True, max_length=255)
    ea_id: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None)

class ClubCreate(ClubBase):
    pass

class ClubUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    ea_id: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None)

class Club(ClubBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    season_links: list["ClubSeasonRelationship"] = Relationship(back_populates="club")

class ClubPublic(ClubBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    season_count: int = 0
    history: list["ClubSeasonHistory"] = []

class ClubsPublic(SQLModel):
    data: list[ClubPublic]
    count: int


# Club–Season join table

class ClubSeasonRelationship(SQLModel, table=True):
    __tablename__ = "club_season"  # type: ignore
    club_id: uuid.UUID = Field(
        foreign_key="club.id", primary_key=True, ondelete="CASCADE"
    )
    season_id: uuid.UUID = Field(
        foreign_key="season.id", primary_key=True, ondelete="CASCADE"
    )
    club: Club = Relationship(back_populates="season_links")
    season: Season = Relationship(back_populates="club_links")


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# SchedulerConfig Model

class SchedulerConfig(SQLModel, table=True):
    __tablename__ = "scheduler_config"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    season_id: uuid.UUID = Field(
        foreign_key="season.id", unique=True, ondelete="CASCADE"
    )
    is_active: bool = Field(default=False)
    is_paused: bool = Field(default=False)
    days_of_week: list[int] = Field(default=[], sa_type=JSON)
    start_hour: int = Field(default=18, ge=0, le=23)
    end_hour: int = Field(default=23, ge=0, le=23)
    interval_minutes: int = Field(default=30, ge=0)
    interval_seconds: int = Field(default=0, ge=0, le=59)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    runs: list["SchedulerRun"] = Relationship(back_populates="scheduler_config")


class SchedulerConfigCreate(SQLModel):
    days_of_week: list[int] = Field(default=[])
    start_hour: int = Field(default=18, ge=0, le=23)
    end_hour: int = Field(default=23, ge=0, le=23)
    interval_minutes: int = Field(default=30, ge=0)
    interval_seconds: int = Field(default=0, ge=0, le=59)

    @model_validator(mode="after")
    def total_interval_at_least_one_second(self) -> "SchedulerConfigCreate":
        if self.interval_minutes * 60 + self.interval_seconds < 1:
            raise ValueError("Total interval must be at least 1 second")
        return self


class SchedulerConfigUpdate(SQLModel):
    days_of_week: list[int] | None = None
    start_hour: int | None = Field(default=None, ge=0, le=23)
    end_hour: int | None = Field(default=None, ge=0, le=23)
    interval_minutes: int | None = Field(default=None, ge=0)
    interval_seconds: int | None = Field(default=None, ge=0, le=59)

    @model_validator(mode="after")
    def total_interval_at_least_one_second(self) -> "SchedulerConfigUpdate":
        mins = self.interval_minutes
        secs = self.interval_seconds
        if mins is not None and secs is not None:
            if mins * 60 + secs < 1:
                raise ValueError("Total interval must be at least 1 second")
        return self


class SchedulerConfigPublic(SQLModel):
    id: uuid.UUID
    season_id: uuid.UUID
    is_active: bool
    is_paused: bool
    days_of_week: list[int]
    start_hour: int
    end_hour: int
    interval_minutes: int
    interval_seconds: int
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SchedulerConfigWithStatus(SchedulerConfigPublic):
    season_name: str | None = None
    league_name: str | None = None
    last_run_at: datetime | None = None
    last_run_status: str | None = None
    total_matches: int = 0
    is_running: bool = False


# Match Model

class Match(SQLModel, table=True):
    __tablename__ = "match"  # type: ignore
    __table_args__ = (
        UniqueConstraint("ea_match_id", "ea_timestamp", name="uq_match_ea_match_id_timestamp"),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ea_match_id: str = Field(index=True, max_length=64)
    ea_timestamp: int
    season_id: uuid.UUID = Field(foreign_key="season.id", ondelete="CASCADE")
    club_id: uuid.UUID = Field(foreign_key="club.id", ondelete="CASCADE")
    home_club_ea_id: str | None = Field(default=None, max_length=64)
    away_club_ea_id: str | None = Field(default=None, max_length=64)
    home_score: int | None = Field(default=None)
    away_score: int | None = Field(default=None)
    raw_json: dict[str, Any] | None = Field(default=None, sa_type=JSON)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class MatchPublic(SQLModel):
    id: uuid.UUID
    ea_match_id: str
    ea_timestamp: int
    season_id: uuid.UUID
    club_id: uuid.UUID
    home_club_ea_id: str | None = None
    away_club_ea_id: str | None = None
    home_score: int | None = None
    away_score: int | None = None
    created_at: datetime | None = None


class MatchWithContext(MatchPublic):
    season_name: str | None = None
    league_name: str | None = None
    is_home: bool | None = None
    opponent_ea_id: str | None = None


class MatchesPublic(SQLModel):
    data: list[MatchWithContext]
    count: int


# SchedulerRun Model

class SchedulerRunStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class SchedulerRun(SQLModel, table=True):
    __tablename__ = "scheduler_run"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    scheduler_config_id: uuid.UUID = Field(
        foreign_key="scheduler_config.id", ondelete="CASCADE"
    )
    season_id: uuid.UUID = Field(foreign_key="season.id", ondelete="CASCADE")
    started_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    finished_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    status: SchedulerRunStatus = Field(default=SchedulerRunStatus.RUNNING)
    matches_fetched: int = Field(default=0)
    matches_new: int = Field(default=0)
    error_message: str | None = Field(default=None)
    scheduler_config: SchedulerConfig = Relationship(back_populates="runs")


class SchedulerRunPublic(SQLModel):
    id: uuid.UUID
    scheduler_config_id: uuid.UUID
    season_id: uuid.UUID
    started_at: datetime
    finished_at: datetime | None = None
    status: SchedulerRunStatus
    matches_fetched: int
    matches_new: int
    error_message: str | None = None


class SchedulerRunsPublic(SQLModel):
    data: list[SchedulerRunPublic]
    count: int


# ---------------------------------------------------------------------------
# Player Models
# ---------------------------------------------------------------------------

class Player(SQLModel, table=True):
    __tablename__ = "player"  # type: ignore
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ea_player_id: str = Field(unique=True, index=True, max_length=64)
    gamertag: str = Field(index=True, max_length=255)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    stats: list["PlayerMatchStats"] = Relationship(back_populates="player")


class PlayerPublic(SQLModel):
    id: uuid.UUID
    ea_player_id: str
    gamertag: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PlayersPublic(SQLModel):
    data: list[PlayerPublic]
    count: int


# ---------------------------------------------------------------------------
# PlayerMatchStats Model
# ---------------------------------------------------------------------------

class PlayerMatchStats(SQLModel, table=True):
    __tablename__ = "player_match_stats"  # type: ignore
    __table_args__ = (
        UniqueConstraint("ea_player_id", "ea_match_id", name="uq_player_match_stats_player_match"),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    player_id: uuid.UUID = Field(foreign_key="player.id", ondelete="CASCADE", index=True)
    ea_player_id: str = Field(index=True, max_length=64)
    ea_match_id: str = Field(index=True, max_length=64)
    ea_timestamp: int | None = Field(default=None)
    match_id: uuid.UUID | None = Field(default=None, foreign_key="match.id", ondelete="CASCADE")

    # --- EA stat fields (all values arrive as strings from EA, cast on ingestion) ---
    stat_class: int | None = Field(default=None)
    glbrksavepct: float | None = Field(default=None)
    glbrksaves: int | None = Field(default=None)
    glbrkshots: int | None = Field(default=None)
    gldsaves: int | None = Field(default=None)
    glga: int | None = Field(default=None)
    glgaa: float | None = Field(default=None)
    glpensavepct: float | None = Field(default=None)
    glpensaves: int | None = Field(default=None)
    glpenshots: int | None = Field(default=None)
    glpkclearzone: int | None = Field(default=None)
    glpokechecks: int | None = Field(default=None)
    glsavepct: float | None = Field(default=None)
    glsaves: int | None = Field(default=None)
    glshots: int | None = Field(default=None)
    glsoperiods: int | None = Field(default=None)
    is_guest: int | None = Field(default=None)
    opponent_club_id: str | None = Field(default=None, max_length=64)
    opponent_score: int | None = Field(default=None)
    opponent_team_id: str | None = Field(default=None, max_length=64)
    player_dnf: int | None = Field(default=None)
    player_level: int | None = Field(default=None)
    p_nhl_online_game_type: str | None = Field(default=None, max_length=32)
    position: str | None = Field(default=None, max_length=64)
    pos_sorted: int | None = Field(default=None)
    rating_defense: float | None = Field(default=None)
    rating_offense: float | None = Field(default=None)
    rating_teamplay: float | None = Field(default=None)
    score: int | None = Field(default=None)
    skassists: int | None = Field(default=None)
    skbs: int | None = Field(default=None)
    skdeflections: int | None = Field(default=None)
    skfol: int | None = Field(default=None)
    skfopct: float | None = Field(default=None)
    skfow: int | None = Field(default=None)
    skgiveaways: int | None = Field(default=None)
    skgoals: int | None = Field(default=None)
    skgwg: int | None = Field(default=None)
    skhits: int | None = Field(default=None)
    skinterceptions: int | None = Field(default=None)
    skpassattempts: int | None = Field(default=None)
    skpasses: int | None = Field(default=None)
    skpasspct: float | None = Field(default=None)
    skpenaltiesdrawn: int | None = Field(default=None)
    skpim: int | None = Field(default=None)
    skpkclearzone: int | None = Field(default=None)
    skplusmin: int | None = Field(default=None)
    skpossession: int | None = Field(default=None)
    skppg: int | None = Field(default=None)
    sksaucerpasses: int | None = Field(default=None)
    skshg: int | None = Field(default=None)
    skshotattempts: int | None = Field(default=None)
    skshotonnetpct: float | None = Field(default=None)
    skshotpct: float | None = Field(default=None)
    skshots: int | None = Field(default=None)
    sktakeaways: int | None = Field(default=None)
    team_id: str | None = Field(default=None, max_length=64)
    team_side: int | None = Field(default=None)
    toi: int | None = Field(default=None)
    toiseconds: int | None = Field(default=None)
    client_platform: str | None = Field(default=None, max_length=32)

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    player: Player = Relationship(back_populates="stats")


class PlayerMatchStatsPublic(SQLModel):
    id: uuid.UUID
    ea_player_id: str
    ea_match_id: str
    ea_timestamp: int | None = None
    match_id: uuid.UUID | None = None
    stat_class: int | None = None
    glbrksavepct: float | None = None
    glbrksaves: int | None = None
    glbrkshots: int | None = None
    gldsaves: int | None = None
    glga: int | None = None
    glgaa: float | None = None
    glpensavepct: float | None = None
    glpensaves: int | None = None
    glpenshots: int | None = None
    glpkclearzone: int | None = None
    glpokechecks: int | None = None
    glsavepct: float | None = None
    glsaves: int | None = None
    glshots: int | None = None
    glsoperiods: int | None = None
    is_guest: int | None = None
    opponent_club_id: str | None = None
    opponent_score: int | None = None
    opponent_team_id: str | None = None
    player_dnf: int | None = None
    player_level: int | None = None
    p_nhl_online_game_type: str | None = None
    position: str | None = None
    pos_sorted: int | None = None
    rating_defense: float | None = None
    rating_offense: float | None = None
    rating_teamplay: float | None = None
    score: int | None = None
    skassists: int | None = None
    skbs: int | None = None
    skdeflections: int | None = None
    skfol: int | None = None
    skfopct: float | None = None
    skfow: int | None = None
    skgiveaways: int | None = None
    skgoals: int | None = None
    skgwg: int | None = None
    skhits: int | None = None
    skinterceptions: int | None = None
    skpassattempts: int | None = None
    skpasses: int | None = None
    skpasspct: float | None = None
    skpenaltiesdrawn: int | None = None
    skpim: int | None = None
    skpkclearzone: int | None = None
    skplusmin: int | None = None
    skpossession: int | None = None
    skppg: int | None = None
    sksaucerpasses: int | None = None
    skshg: int | None = None
    skshotattempts: int | None = None
    skshotonnetpct: float | None = None
    skshotpct: float | None = None
    skshots: int | None = None
    sktakeaways: int | None = None
    team_id: str | None = None
    team_side: int | None = None
    toi: int | None = None
    toiseconds: int | None = None
    client_platform: str | None = None
    created_at: datetime | None = None


class PlayerDetailPublic(SQLModel):
    id: uuid.UUID
    ea_player_id: str
    gamertag: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    stats: list[PlayerMatchStatsPublic] = []

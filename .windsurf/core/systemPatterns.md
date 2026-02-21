# System Patterns: XBHL

## Architecture Overview

```
┌─────────────────────────────────────────┐
│          Frontend (React/Vite)          │
│  TanStack Router + Query + shadcn/ui   │
└──────────────────┬──────────────────────┘
                   │ HTTP (OpenAPI client)
┌──────────────────▼──────────────────────┐
│         Backend API (FastAPI)           │
│   Router → Service → Repository/CRUD   │
└──────────────────┬──────────────────────┘
                   │ SQLModel ORM
┌──────────────────▼──────────────────────┐
│     PostgreSQL (Supabase-hosted)        │
└─────────────────────────────────────────┘
         ▲ Scheduler polls independently
┌────────┴────────────────────────────────┐
│  EA Pro Clubs API (external, read-only) │
│  club search → clubId                  │
│  matches by clubId → JSON              │
└─────────────────────────────────────────┘
```

## Backend: Service Layer Pattern

```
backend/app/
  api/
    routes/          – HTTP routers (no business logic)
      leagues.py
      seasons.py
      clubs.py
      players.py
      matches.py
      scheduler.py
      users.py
      login.py
    deps.py          – FastAPI dependencies (auth, db session)
    main.py          – APIRouter aggregation
  services/          – Business logic layer (planned, not yet implemented)
    league_service.py
    season_service.py
    club_service.py
    player_service.py
    match_service.py
    scheduler_service.py
  crud.py            – DB operations (repository layer)
  models.py          – SQLModel table + schema definitions
  core/
    config.py        – Settings (pydantic-settings)
    db.py            – DB engine + session
    security.py      – JWT + bcrypt helpers
  alembic/           – Migration scripts
  main.py            – FastAPI app factory
```

## Domain Model & Relationships

```
User (id, email, gamertag, full_name, hashed_password, is_superuser)
  └── (optional) linked to Player via gamertag

League (id, name, league_type[3v3|6v6], is_active)
  ├── seasons: list[Season]
  └── scheduler_config: SchedulerConfig

Season (id, league_id FK, name, start_date, end_date)
  ├── league: League
  ├── clubs: list[Club] via ClubSeasonRelationship
  ├── players: list[Player] via PlayerSeasonRelationship
  └── matches: list[Match]

Club (id, name, ea_club_id, league_id)
  ├── seasons: list[Season] via ClubSeasonRelationship
  ├── players: list[Player]
  └── matches: list[Match]

Player (id, gamertag UNIQUE, full_name, user_id FK nullable)
  ├── clubs: list[Club]
  ├── seasons: list[Season] via PlayerSeasonRelationship
  └── matches: list[Match] via PlayerMatchHistory

Match (id, match_id UNIQUE+timestamp UNIQUE, season_id, raw_json)
  ├── clubs: list[Club]
  └── players: list[Player] via PlayerMatchHistory

SchedulerConfig (id, league_id FK unique, active_days, start_time, end_time, interval_minutes, is_active)
SchedulerRun (id, scheduler_config_id FK, started_at, ended_at, status, matches_ingested, error_msg)

-- Join Tables --
ClubSeasonRelationship (club_id, season_id)
PlayerSeasonRelationship (player_id, season_id)
PlayerMatchHistory (player_id, match_id, stats_json)
```

## Scheduler System Pattern

```
SchedulerManager (singleton)
  ├── league_1_job (APScheduler job, isolated)
  ├── league_2_job (APScheduler job, isolated)
  └── league_N_job (APScheduler job, isolated)

Each job runs:
  1. Load SchedulerConfig (active_days, time_window_EST, interval)
  2. Check: current time in EST within active_days + time_window?
  3. For each active Season in League:
     a. For each Club in Season:
        - GET EA API: club search → clubId
        - GET EA API: private matches by clubId
        - Filter: within season date range + time window
        - Deduplicate: check match_id + timestamp against DB
        - Insert new matches (bulk upsert, ignore duplicates)
        - Associate match with Season, Club(s), Player(s)
  4. Log SchedulerRun (status, match count, errors)
```

## Authentication Pattern
- JWT access token (short TTL) + refresh token (long TTL)
- bcrypt for password hashing
- Login accepts email OR gamertag + password
- `is_superuser` flag for admin privileges
- FastAPI dependency `get_current_user` → `get_current_active_superuser` for admin routes

## Frontend Architecture
```
frontend/src/
  client/           – Auto-generated OpenAPI TypeScript client
  routes/           – TanStack Router file-based routes
    _layout.tsx     – Authenticated layout wrapper
    _layout/
      admin/        – Admin-only routes (superuser guard)
      player/       – Player routes
    login.tsx
    signup.tsx
  components/       – Reusable shadcn/ui + custom components
  hooks/            – Custom React hooks
```

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| DB deduplication | UNIQUE(match_id, timestamp) | Cannot rely on application logic alone |
| Scheduler isolation | One APScheduler job per league | Crash isolation, independent control |
| Timezone handling | Store UTC, convert to EST in logic | Standard practice, avoids DST bugs |
| ORM | SQLModel | Unifies Pydantic + SQLAlchemy in FastAPI ecosystem |
| Frontend API calls | Generated OpenAPI client | Type-safe, always in sync with backend |
| Primary keys | UUID v4 | Avoids sequential ID enumeration |
| Player pre-existence | Store before registration | Retroactive linking is a core feature |
| Raw JSON storage | Store full EA match payload | Schema refinement later without data loss |

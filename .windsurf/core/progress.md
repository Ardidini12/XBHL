# Progress: XBHL

## Legend
- ✅ Complete | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Infrastructure & Setup
- ✅ FastAPI full-stack template scaffolded (Docker Compose, Traefik, Alembic, JWT auth)
- ✅ PostgreSQL connection configured (Supabase-ready)
- ✅ Email-based password recovery flow
- ✅ Mailcatcher for local email testing
- ✅ Playwright E2E test setup
- ✅ Biome linter/formatter configured
- ✅ `.windsurfrules` created with full XBHL meta-cognitive workflow architecture
- ✅ `.windsurf/` memory bank initialized

---

## Backend

### Models (`backend/app/models.py`)
- ✅ `User` (id, email, gamertag, full_name, hashed_password, is_superuser, created_at)
- ✅ `League` (id, name, league_type[3v3|6v6], is_active, description, created_at, updated_at)
- ✅ `Season` (id, league_id FK, name, start_date, end_date, created_at, updated_at)
- ✅ `Club` (id, name, ea_club_id, league_id, created_at)
- ⏳ `Player` (id, gamertag UNIQUE, full_name, user_id FK nullable, created_at)
- ⏳ `Match` (id, match_id, timestamp, season_id FK, raw_json, created_at) — UNIQUE(match_id, timestamp)
- ⏳ `SchedulerConfig` (id, league_id FK unique, active_days, start_time, end_time, interval_minutes, is_active)
- ⏳ `SchedulerRun` (id, scheduler_config_id FK, started_at, ended_at, status, matches_ingested, error_msg)
- ✅ `ClubSeasonRelationship` (club_id FK, season_id FK) — join table
- ⏳ `PlayerSeasonRelationship` (player_id FK, season_id FK) — join table
- ⏳ `PlayerMatchHistory` (player_id FK, match_id FK, stats_json) — join table

### Database Migrations
- ✅ Initial migration (User, League, Season tables)
- ✅ Migration for Club + ClubSeasonRelationship tables
- ⏳ Migration for Player, Match, Scheduler tables

### API Routes (`backend/app/api/routes/`)
- ✅ `login.py` — authentication (email OR gamertag + password)
- ✅ `users.py` — user CRUD
- ✅ `leagues.py` — league CRUD
- ✅ `seasons.py` — season CRUD (nested under league)
- ✅ `clubs.py` — club CRUD (create, read, update, delete, season membership)
- ⏳ `players.py` — player CRUD + career history endpoint
- ⏳ `matches.py` — match read endpoints
- ⏳ `scheduler.py` — scheduler config CRUD + start/stop/status

### Service Layer (`backend/app/services/`) — NOT YET CREATED
- ⏳ `league_service.py`
- ⏳ `season_service.py`
- ⏳ `club_service.py`
- ⏳ `player_service.py`
- ⏳ `match_service.py`
- ⏳ `scheduler_service.py`

### EA API Client (`backend/app/`) — NOT YET CREATED
- ⏳ `ea_api_client.py` — HTTP client (club search + private matches)

### Scheduler System — NOT YET CREATED
- ⏳ `scheduler_manager.py` — APScheduler singleton with per-league job isolation
- ⏳ Job lifecycle: start, stop, resume, delete
- ⏳ Ingestion loop: fetch → filter → deduplicate → store → log

### CRUD (`backend/app/crud.py`)
- ✅ User CRUD
- ✅ League CRUD (basic)
- ✅ Season CRUD (basic)
- ✅ Club CRUD
- ⏳ Player CRUD
- ⏳ Match CRUD (insert with deduplication)
- ⏳ Scheduler CRUD

### Tests (`backend/tests/`)
- ✅ User endpoints tests
- ✅ Login tests
- ⏳ League endpoint tests
- ⏳ Season endpoint tests
- ⏳ Club endpoint tests
- ⏳ Player endpoint tests
- ⏳ Match endpoint tests
- ⏳ Scheduler tests (with mocked EA API)

---

## Frontend

### Auth
- ✅ Login page (`routes/login.tsx`) — email/gamertag + password
- ✅ Signup page (`routes/signup.tsx`) — register with gamertag
- ✅ Password recovery (`routes/recover-password.tsx`)
- ✅ Password reset (`routes/reset-password.tsx`)
- ✅ Authenticated layout wrapper (`routes/_layout.tsx`)

### Admin Views (`routes/_layout/admin/`) — PENDING
- ⏳ Dashboard (league list / create league prompt)
- ⏳ League page (season list)
- ⏳ Season page (clubs, players, scheduler panel)
- ⏳ Scheduler configuration UI (days, time window, interval)
- ⏳ Scheduler monitor (status, last run, match count)

### Player Views (`routes/_layout/player/`) — PENDING
- ⏳ Dashboard (career summary, participated leagues)
- ⏳ Profile page (career timeline, match history)

### OpenAPI Client
- ✅ Client generated for User, League, Season, Club routes
- ⏳ Regenerate after Player, Match, Scheduler routes added

---

## Known Issues / Debt
- `Season` model currently lacks relationship to `clubs` and `players` (join tables not yet defined)
- `crud.py` needs refactoring into per-domain files or a service layer once entities grow
- EA API platform parameter not yet finalized (need to confirm supported platforms)

# Plan: Domain Models — Club, Player, Match, Scheduler

## Goal
Implement all remaining domain entities to complete the XBHL data model.

## Success Criteria
- All 8 missing models defined in `models.py` with correct relationships and constraints
- Alembic migration generated and applies cleanly
- CRUD operations in `crud.py` for each entity
- All API routes registered and returning correct Public schemas
- OpenAPI client regenerated and frontend can import new types
- At least one Pytest test per new route (happy path)

## Steps

### Phase 1: Models
- [ ] Add `Club` model (id, name, ea_club_id, league_id FK, created_at)
- [ ] Add `Player` model (id, gamertag UNIQUE, full_name, user_id FK nullable)
- [ ] Add `Match` model (id, match_id, timestamp, season_id FK, raw_json JSONB) — UNIQUE(match_id, timestamp)
- [ ] Add `SchedulerConfig` model (id, league_id FK unique, active_days JSON, start_time, end_time, interval_minutes, is_active)
- [ ] Add `SchedulerRun` model (id, scheduler_config_id FK, started_at, ended_at, status, matches_ingested, error_msg)
- [ ] Add `ClubSeasonRelationship` join table
- [ ] Add `PlayerSeasonRelationship` join table
- [ ] Add `PlayerMatchHistory` join table (player_id, match_id, stats_json)
- [ ] Add back-populate relationships on Season, League, Club, Player, Match

### Phase 2: Migration
- [ ] Run `uv run alembic revision --autogenerate -m "add_club_player_match_scheduler"`
- [ ] Review generated migration script
- [ ] Run `uv run alembic upgrade head`

### Phase 3: CRUD
- [ ] `create_club`, `get_club`, `get_clubs`, `update_club`, `delete_club`
- [ ] `create_player`, `get_player_by_gamertag`, `get_players`, `update_player`, `link_player_to_user`
- [ ] `create_match`, `get_matches_by_season`, `get_matches_by_player` — upsert with deduplication
- [ ] `create_scheduler_config`, `get_scheduler_config_by_league`, `update_scheduler_config`
- [ ] `create_scheduler_run`, `get_scheduler_runs_by_config`

### Phase 4: Services
- [ ] Create `backend/app/services/` directory
- [ ] `club_service.py` — includes EA API club search to resolve ea_club_id
- [ ] `player_service.py` — includes retroactive user linking logic
- [ ] `match_service.py` — deduplication + association logic
- [ ] `scheduler_service.py` — APScheduler job management (start/stop/status)
- [ ] `ea_api_client.py` — HTTP client with retry/backoff

### Phase 5: Routes
- [ ] `clubs.py` — CRUD + EA search endpoint
- [ ] `players.py` — CRUD + career history endpoint
- [ ] `matches.py` — read endpoints (by season, by club, by player)
- [ ] `scheduler.py` — config CRUD + start/stop/status actions
- [ ] Register all in `backend/app/api/main.py`

### Phase 6: Tests
- [ ] Tests for each new route (happy path + key edge cases)
- [ ] Scheduler tests with mocked EA API responses

### Phase 7: Frontend Client
- [ ] Run `bun run generate-client` to regenerate OpenAPI TypeScript client

## Dependencies
- Must complete Phase 1 + 2 before Phase 3
- Must complete Phase 3 + 4 before Phase 5
- Must complete Phase 5 before Phase 7

## Notes
- Use `JSONB` type for `Match.raw_json` and `PlayerMatchHistory.stats_json`
- `SchedulerConfig.active_days` stored as JSON array of day names e.g. `["tuesday", "wednesday"]`
- `SchedulerConfig.start_time` / `end_time` stored as `time` type (time-of-day, no date)
- Player can exist without a User account — `user_id` is nullable

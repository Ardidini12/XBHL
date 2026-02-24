# Active Context: XBHL

## Current Session
- **Date**: 2026-02-24
- **Focus**: Players feature — full end-to-end implementation

## Current Work State

Players feature fully implemented. New `Player` and `PlayerMatchStats` tables added. Scheduler now extracts all players from both teams on every new match fetch. Backend routes and frontend pages complete. Awaiting user to run migration + regenerate client + start dev server.

## What Was Just Done (This Session — 2026-02-24)
1. **`Player` model** — `player` table: id (UUID PK), ea_player_id (UNIQUE), gamertag, created_at, updated_at
2. **`PlayerMatchStats` model** — `player_match_stats` table: 60+ EA stat columns, UNIQUE(ea_player_id, ea_match_id)
3. **Player extraction** — `_extract_and_store_players()` added to `scheduler_service.py`; called after every new match insert; iterates both clubs' player arrays; upserts Player rows; inserts stat rows with deduplication
4. **Players router** — `backend/app/api/routes/players.py`: `GET /players/` (list, gamertag search), `GET /players/{ea_player_id}` (detail with all match stats)
5. **Alembic migration** — `c3d4e5f6a7b8_add_player_and_player_match_stats.py` (down_revision: b2c3d4e5f6a7)
6. **Frontend types** — `PlayerPublic`, `PlayersPublic`, `PlayerMatchStatsPublic`, `PlayerDetailPublic` + request/response types added to `types.gen.ts`
7. **Frontend service** — `PlayersService.listPlayers()` + `PlayersService.getPlayer()` added to `sdk.gen.ts`
8. **Players list page** — `src/routes/_layout/players.tsx`: searchable, paginated table; click row → detail
9. **Player detail page** — `src/routes/_layout/players.$eaPlayerId.tsx`: horizontally-scrollable stat table; columns grouped by CSV order (Overview, Shooting, Passing, Puck Control, Defense, Faceoffs, TOI, Goalie, Meta); sticky date + match ID columns
10. **Sidebar** — Players link (UserRound icon) added after Matches

## Immediate Next Steps (Priority Order)
1. User runs: `alembic upgrade head` from `backend/`
2. User runs: `bun run generate-client` from `frontend/`
3. User starts dev server → `routeTree.gen.ts` auto-regenerates → all route lint errors resolve
4. Test: run scheduler against a season with clubs → verify player rows populate

## What Was Just Done (Previous Session — 2026-02-24 earlier)
1. **Timezone enforcement** — all times now `America/New_York` throughout

## What Was Just Done (Previous Session — 2026-02-21)
1. **SchedulerConfig + SchedulerRun models** — added to `models.py`
2. **Match model** — added to `models.py` with UNIQUE(ea_match_id, ea_timestamp)
3. **EA API client** — `services/ea_client.py` (club search + match fetch)
4. **Scheduler service** — `services/scheduler_service.py` (APScheduler per-season, lifecycle, fetch loop, audit logging)
5. **Scheduler routes** — `api/routes/schedulers.py` (CRUD + start/stop/pause/resume/runs)
6. **Match routes** — `api/routes/matches.py` (by club, by season)
7. **FastAPI lifespan** — `main.py` starts/stops APScheduler, loads active jobs on startup
8. **Frontend** — `SchedulerConfigModal.tsx`, `schedulers.tsx` route, Schedulers sidebar link

## What Was Just Done (This Session — 2026-02-23)
1. **Alembic chain fix** — recreated `526f79a65431_add_scheduler_match_models.py` (was applied to DB but file was lost)
2. **Frontend client** — added Scheduler + Match types to `types.gen.ts`; added `SchedulersService` + `MatchesService` to `sdk.gen.ts`

## Open Questions / Decisions Pending
- EA API platform parameter: `common-gen5` is set in `ea_client.py` — confirm this is correct for NHL 25

## Recently Modified Files (This Session)
- `backend/app/models.py` — Player + PlayerMatchStats + Public schemas added
- `backend/app/services/scheduler_service.py` — Player/PlayerMatchStats imported; _safe_int/_safe_float helpers; _extract_and_store_players() added; _store_match() hooks player extraction
- `backend/app/api/routes/players.py` — NEW
- `backend/app/api/main.py` — players router registered
- `backend/app/alembic/versions/c3d4e5f6a7b8_add_player_and_player_match_stats.py` — NEW
- `frontend/src/client/types.gen.ts` — Player types added
- `frontend/src/client/sdk.gen.ts` — PlayersService added; player types import line added
- `frontend/src/routes/_layout/players.tsx` — NEW
- `frontend/src/routes/_layout/players.$eaPlayerId.tsx` — NEW
- `frontend/src/components/Sidebar/AppSidebar.tsx` — Players link added

## Blockers
None. User must run 3 commands (see Immediate Next Steps above).

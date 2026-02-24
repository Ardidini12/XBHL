# Active Context: XBHL

## Current Session
- **Date**: 2026-02-24
- **Focus**: Timezone enforcement — all times now America/New_York (ET) throughout

## Current Work State

Scheduler, Match, and EA API client are fully implemented. The Alembic migration chain was broken (DB had revision `526f79a65431` which was missing locally) — recreated the file. Frontend client types and service classes for Schedulers and Matches have been added manually to `types.gen.ts` and `sdk.gen.ts`. All migration and client-gen commands are run by the user — never automatically.

## What Was Just Done (This Session — 2026-02-24)
1. **Timezone enforcement** — all times now `America/New_York` throughout:
   - `scheduler_service.py` — hour/day-of-week window check now uses `ZoneInfo("America/New_York")` instead of UTC
   - `SchedulerConfigModal.tsx` — labels changed from `Start/End Hour (UTC)` → `Start/End Hour (ET)`
   - `schedulers.tsx` — column header `Window (UTC)` → `Window (ET)`; hour display appends ` ET`
   - `seasonColumns.tsx` — replaced `date-fns format/parseISO` (browser-local) with `Intl` formatter using `timeZone: "America/New_York"`; column headers now `Start/End Date (ET)`

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

## Immediate Next Steps (Priority Order)

### Backend
1. **Run migration** — user must run `alembic upgrade head` from `backend/` to verify chain resolves (tables already exist in DB, so it should be a no-op)
2. **Player model** — `Player` (id, gamertag UNIQUE, full_name, user_id FK nullable)
3. **PlayerSeasonRelationship** join table
4. **PlayerMatchHistory** join table

### Frontend
1. **Push to git + redeploy** — `routeTree.gen.ts` auto-regenerates on dev server start
2. **SchedulerConfigModal integration** — wire into season detail page

## Open Questions / Decisions Pending
- EA API platform parameter: `common-gen5` is set in `ea_client.py` — confirm this is correct for NHL 25
- Player model: confirm if `club_id` FK is needed on Player or handled purely via match history

## Recently Modified Files
- `backend/app/models.py` — SchedulerConfig, SchedulerRun, Match models added
- `backend/app/services/scheduler_service.py` — created
- `backend/app/services/ea_client.py` — created
- `backend/app/api/routes/schedulers.py` — created
- `backend/app/api/routes/matches.py` — created
- `backend/app/api/main.py` — schedulers + matches routers registered
- `backend/app/main.py` — lifespan with APScheduler start/stop/load
- `backend/app/alembic/versions/526f79a65431_add_scheduler_match_models.py` — recreated (chain fix)
- `frontend/src/client/types.gen.ts` — Scheduler + Match types added
- `frontend/src/client/sdk.gen.ts` — SchedulersService + MatchesService added
- `frontend/src/components/Admin/SchedulerConfigModal.tsx` — created
- `frontend/src/routes/_layout/schedulers.tsx` — created
- `frontend/src/components/Sidebar/AppSidebar.tsx` — Schedulers link already present

## Blockers
None. User needs to run `alembic upgrade head` from `backend/` to verify migration chain.

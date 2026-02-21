# Active Context: XBHL

## Current Session
- **Date**: 2026-02-21
- **Focus**: League→Season→Club admin UI + Club backend (completed)

## Current Work State

Club implementation is fully complete. The admin UI now supports navigating League → Season → Club with full CRUD. Alembic migration for `club` and `club_season` tables has been applied to production. Infrastructure note: no Docker locally — project is deployed online. All migration and client-gen commands are run by the user.

## What Was Just Done
1. **Sidebar fix** — `staleTime: 5min` on `currentUser` query; `isActive` uses `startsWith` in `Main.tsx`
2. **Season edit** — `EditSeason.tsx` component; "Edit Name" + "Enter Season" added to `SeasonActionsMenu`
3. **Season detail route** — `leagues.$leagueId.tsx` converted to parent layout with `Outlet`; `leagues.$leagueId.seasons.$seasonId.tsx` created
4. **Club model** — `Club`, `ClubSeasonRelationship` added to `models.py`; migration applied
5. **Club CRUD** — `create_club`, `get_clubs_by_season` (with season_count), `add_club_to_season`, `remove_club_from_season`, `update_club`, `delete_club` in `crud.py`
6. **Club routes** — `clubs.py` nested under `/leagues/{league_id}/seasons/{season_id}/clubs/`; registered in `main.py`
7. **Frontend client** — `ClubPublic`, `ClubsPublic`, `ClubCreate`, `ClubUpdate` types + `ClubsService` added to `types.gen.ts` + `sdk.gen.ts`
8. **Frontend components** — `AddClub.tsx`, `EditClub.tsx`, `ClubActionsMenu.tsx`, `clubColumns.tsx` (factory pattern `makeClubColumns`)
9. **Rules updated** — `.windsurfrules` Rule 17 added: no Docker, user runs all migrations and client-gen

## Immediate Next Steps (Priority Order)

### Frontend
1. **Push to git + redeploy** (user doing now) — `routeTree.gen.ts` will auto-regenerate on dev server start, clearing remaining TS errors
2. **Season detail page polish** — verify clubs table renders correctly after deploy

### Backend
1. **Player model** — `Player` (id, gamertag UNIQUE, full_name, user_id FK nullable)
2. **PlayerSeasonRelationship** join table
3. **Match model** — `Match` (id, match_id, timestamp, season_id FK, raw_json) — UNIQUE(match_id, timestamp)
4. **SchedulerConfig + SchedulerRun** models
5. **EA API client** — HTTP client for club search + private matches
6. **Scheduler system** — APScheduler per-league job isolation

## Open Questions / Decisions Pending
- Scheduler: APScheduler (simpler) vs Celery+Redis (more robust)?
- EA API platform parameter: confirm supported platform values
- Match `raw_json` storage: JSONB column vs separate parsed stats table?

## Recently Modified Files
- `backend/app/models.py` — Club, ClubSeasonRelationship added
- `backend/app/crud.py` — Club CRUD added
- `backend/app/api/routes/clubs.py` — created
- `backend/app/api/main.py` — clubs router registered
- `frontend/src/client/types.gen.ts` — Club types added
- `frontend/src/client/sdk.gen.ts` — ClubsService added
- `frontend/src/components/Admin/AddClub.tsx` — created
- `frontend/src/components/Admin/EditClub.tsx` — created
- `frontend/src/components/Admin/ClubActionsMenu.tsx` — created
- `frontend/src/components/Admin/clubColumns.tsx` — created (makeClubColumns factory)
- `frontend/src/components/Admin/EditSeason.tsx` — created
- `frontend/src/components/Admin/SeasonActionsMenu.tsx` — Enter Season + Edit Name added
- `frontend/src/routes/_layout/leagues.$leagueId.tsx` — converted to parent layout
- `frontend/src/routes/_layout/leagues.$leagueId.seasons.$seasonId.tsx` — created
- `frontend/src/components/Sidebar/Main.tsx` — isActive startsWith fix
- `frontend/src/hooks/useAuth.ts` — staleTime added
- `.windsurfrules` — Rule 17 (user-run commands) + infra/Docker note updated

## Blockers
None. User pushing to git and redeploying.

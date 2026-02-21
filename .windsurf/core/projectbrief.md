# Project Brief: XBHL – Xblade Hockey League Platform

## Elevator Pitch
XBHL is a platform that manages custom NHL Pro Clubs leagues on top of EA's Pro Clubs infrastructure. Because EA deletes historical match data after a period of time, our platform permanently persists all match data, builds complete league and player career history, and enables long-term analytics and prediction features.

## Core Goals
1. **Data Persistence** — Store all match data permanently before EA deletes it
2. **Career History** — Build complete player and club career history across leagues and seasons
3. **League Management** — Support multiple concurrent leagues (3v3, 6v6) with seasons, clubs, players
4. **Automated Ingestion** — Per-league schedulers that poll EA API and save new matches
5. **Analytics Foundation** — Historical data enables future performance trends and predictions

## Target Users
- **Admin** — League commissioner; manages leagues, seasons, clubs, players, schedulers
- **Player** — Registered player; views their career history, stats, and participated matches

## Phases
- **Phase 1** (Current): Data persistence, history building, scheduler reliability
- **Phase 2**: Player and team analytics, performance trends
- **Phase 3**: Prediction models, skill metrics, ranking systems

## Acceptance Criteria
- Admin can create leagues, seasons, clubs, configure and run schedulers
- Multiple schedulers run concurrently without interference
- Matches are stored exactly once (deduplication via match_id + timestamp)
- Players can register, login, and view full career history
- Data persists even after EA deletes it
- System enforces EST timezone globally

## Repository
- Root: `{PROJECT_ROOT}`
- Backend: `backend/` (FastAPI + SQLModel)
- Frontend: `frontend/` (React + Vite + TanStack)
- Infra: Docker Compose (`compose.yml`, `compose.override.yml`, `compose.traefik.yml`)

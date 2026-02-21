# Tech Context: XBHL

## Backend

### Runtime & Framework
- **Python**: 3.12+
- **FastAPI**: Web framework (async, OpenAPI auto-generation)
- **SQLModel**: ORM — combines Pydantic v2 + SQLAlchemy 2.0
- **Pydantic v2**: Data validation, settings management
- **Alembic**: Database migrations

### Database
- **PostgreSQL** hosted on **Supabase** (transaction pooler)
- Connection via `DATABASE_URL` in `.env`
- All timestamps: `DateTime(timezone=True)`, stored UTC
- UUID primary keys on all entities

### Authentication
- **JWT**: Access token (short TTL) + optional refresh token
- **bcrypt**: Password hashing via `passlib`
- Login accepts email OR gamertag

### Scheduler
- **APScheduler** (preferred) or **Celery + Redis**
- One `BackgroundScheduler` job per League
- Jobs isolated by `job_id = f"league_{league_id}"`
- Timezone: `America/New_York` (pytz or `zoneinfo`)

### Package Manager
- **uv** — `uv add package-name` for new dependencies
- Config: `backend/pyproject.toml`

### Key Dependencies (backend/pyproject.toml)
- `fastapi`, `sqlmodel`, `pydantic[email]`, `pydantic-settings`
- `alembic`, `psycopg[binary]` or `asyncpg`
- `python-jose[cryptography]`, `passlib[bcrypt]`
- `apscheduler` or `celery`, `redis`
- `httpx` (for EA API calls + tests)
- `pytest`, `pytest-asyncio`

### Commands
```bash
# Start backend dev server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Generate Alembic migration after model changes
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head

# Run tests
uv run pytest
```

---

## Frontend

### Runtime & Framework
- **Node.js** + **Bun** (package manager)
- **React 19+** with **TypeScript**
- **Vite**: Build tool and dev server
- **TanStack Router**: File-based routing (NOT react-router-dom)
- **TanStack Query**: Server state management
- **shadcn/ui**: Component library (Radix UI primitives + TailwindCSS)
- **TailwindCSS**: Utility-first styling
- **Biome**: Linter + formatter (replaces ESLint + Prettier)

### API Client
- Auto-generated from backend OpenAPI spec via `openapi-ts`
- Config: `frontend/openapi-ts.config.ts`
- Output: `frontend/src/client/`
- **Never hand-write API calls** — always use generated client

### Key Files
- `frontend/src/main.tsx` — app entry point
- `frontend/src/routes/__root.tsx` — root route
- `frontend/src/routes/_layout.tsx` — authenticated layout
- `frontend/src/routeTree.gen.ts` — auto-generated route tree
- `frontend/openapi.json` — backend OpenAPI spec (source of truth for client gen)

### Commands
```bash
# Start frontend dev server
bun run dev

# Generate OpenAPI client (run after backend route changes)
bun run generate-client

# Run E2E tests
bun run test:e2e

# Lint + format
bun run biome check
```

---

## Infrastructure

### Docker Compose
- `compose.yml` — production-like base services
- `compose.override.yml` — local development overrides
- `compose.traefik.yml` — Traefik reverse proxy for production

### Services
- `backend` — FastAPI app (port 8000)
- `frontend` — Nginx serving built React app (port 80/443)
- `db` — PostgreSQL (Supabase in prod, local in dev)
- `traefik` — Reverse proxy + HTTPS certificates (production)
- `mailcatcher` — Local email testing (port 1080)

### Environment Variables (`.env`)
Key variables (see `.env` file at project root):
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — JWT signing key
- `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD` — admin bootstrap
- `POSTGRES_PASSWORD`
- `BACKEND_CORS_ORIGINS`
- `SMTP_*` — email configuration

---

## Testing

### Backend (Pytest)
- `backend/tests/` — test files
- `uv run pytest` — run all tests
- Uses `httpx.AsyncClient` for API tests
- Fixtures in `conftest.py`

### Frontend E2E (Playwright)
- `frontend/tests/` — Playwright test files
- `frontend/playwright.config.ts` — config
- `bun run test:e2e`

---

## EA Pro Clubs API

### Endpoints (external, unofficial)
- **Club Search**: `GET /clubs/search?clubName={name}&platform={platform}&maxResultCount=5`
  - Returns: `[{ clubId, name, platform, ... }]`
- **Private Matches**: `GET /clubs/{clubId}/matches?matchType=club_private&platform={platform}`
  - Returns: array of match objects with full stats JSON

### Integration Notes
- No official API key required (public EA endpoints)
- Platform values: `common-gen5` (PS5/XSX), `common-gen4` (PS4/XB1)
- Always handle 429 (rate limit) and 5xx (server errors) with exponential backoff
- Cache clubId after first lookup — avoids repeated search calls
- Store full raw JSON in `Match.raw_json` — parse stats in a separate step

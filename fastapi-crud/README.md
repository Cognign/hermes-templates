# FastAPI App Template

This is the standard template used when building full backend applications on Hermes.

## Architecture and Rules

Every application created from this template follows strict security and data boundaries (see `docs/engineering/rules.md`):

- **Dedicated database (`DATA-*`):** The app talks only to its own isolated database. It never accesses other tenant databases or platform internal tables.
- **Alembic migrations (`DATA-*`):** Alembic is the single migration entry point for this application's database schema.
- **OIDC authentication (`AUTH-*`):** User identity is managed using OpenID Connect (OIDC).
- **Host-only cookies (`SEC-*`):** Session cookies use the `__Host-` prefix (`Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`). This prevents cookie access across subdomains.
- **Least privilege (`SEC-*`):** The app never receives platform credentials, deployment tokens, or keys belonging to other services.
- **Fail closed (`SEC-*`):** In production mode, the application requires `DATABASE_URL` and refuses to start without it.

## Commands

Run these commands from the `templates/fastapi-app/` directory:

### Install dependencies
```bash
uv sync
```

### Run linters and formatters
```bash
uv run ruff check .
uv run ruff format --check .
```

### Type checking
```bash
uv run pyright
```

### Run tests
```bash
uv run pytest -q
```

### Apply database migrations
```bash
uv run alembic upgrade head
```

### Start the development server
```bash
uv run uvicorn app.main:app --reload
```

## Endpoints

- `GET /healthz`: Liveness probe. Returns HTTP 200 `{"status": "ok"}` when the process is running.
- `GET /readyz`: Readiness probe. Verifies database connectivity if `DATABASE_URL` is set. Returns HTTP 503 if `DATABASE_URL` is missing or if the database cannot be reached. Never fakes success.

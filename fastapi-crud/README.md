# FastAPI App Template

This is the standard template used when building full backend applications on Hermes.

## Architecture and Rules

Every application created from this template follows strict security and data boundaries (see `docs/engineering/rules.md`):

- **Dedicated database (`DATA-*`):** The app talks only to its own isolated database. It never accesses other tenant databases or platform internal tables.
- **Alembic migrations (`DATA-*`):** Alembic is the single migration entry point for this application's database schema.
- **OIDC authentication (`AUTH-*`):** User identity is managed using OpenID Connect (OIDC).
- **Host-only cookies (`SEC-*`):** Session cookies use the `__Host-` prefix (`Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`). This prevents cookie access across subdomains.
- **Least privilege (`SEC-*`):** The app never receives platform credentials, deployment tokens, or keys belonging to other services.
- **Fail closed (`SEC-*`):** In production mode (`APP_ENV=production`, ignoring case and spaces), the application requires `DATABASE_URL` and refuses to start without it.
- **Preview database:** Outside production, without `DATABASE_URL`, the app stores data in SQLite at `$DATA_DIR/app.db` (default `./.data/app.db`). The file is mode 0600. A `DATA_DIR` the app creates is mode 0700; one that already exists keeps its mode. Preview data does not carry over to the published app, which gets its own PostgreSQL database from Hermes. Publishing is refused on an install that has no app database server.
- **Migrations:** They run at startup on SQLite and PostgreSQL, one process at a time (a PostgreSQL advisory lock, or a lock file next to the SQLite file). A failure names the step and the error type, never the connection details. In a migration that changes an existing table, use `op.batch_alter_table` so it also runs on SQLite.
- **Forms:** Send JSON with `fetch`. HTML form posts need `python-multipart`, which is not in the approved package set.

## Commands

Run these commands from this directory:

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
- `GET /readyz`: Readiness probe. Returns HTTP 200 when the database (PostgreSQL, or SQLite in preview) is reachable and every migration this code knows is applied, and HTTP 503 otherwise. A database already at a newer revision (from a newer release) is ready. Never fakes success.

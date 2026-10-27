---
id: fastapi-crud
version: 1.0.0
summary: A FastAPI service with SQLAlchemy 2, Alembic migrations, health and readiness probes.
use_when: The app is a Python JSON API that stores its own data in PostgreSQL (`DATABASE_URL` is optional outside production), with or without a separate frontend.
---

# FastAPI starter

FastAPI, SQLAlchemy 2 and Alembic. `GET /healthz` and `GET /readyz` already work. `README.md` explains the rules and commands.

## Add one feature

1. **Table:** add a model class that extends `Base` (from `app/db.py`) in a new file under `app/`, for example `app/models.py`.
2. **Migration:** add the next file in `migrations/versions/` (the baseline is `0001_baseline`) with `revision` and `down_revision` set. Do not edit `0001_baseline.py`. If you use `alembic revision --autogenerate`, import your model module in `migrations/env.py` first so it sees the table.
3. **Routes:** add an `APIRouter` in a new file such as `app/routes.py`. Take a session with `Depends(get_db_session)` from `app/db.py`. Check input with Pydantic models. Register the router in `app/main.py` with `app.include_router(...)`.
4. **Test:** add a test in `tests/` that uses `TestClient(app)`.
5. **Stop** when the code and the test are in place.

## Rules

- `DATABASE_URL` is optional outside production and required with `APP_ENV=production`, where the app refuses to start without it. Read it from the environment only. Never commit it. Without it the app starts with no database and `/readyz` returns 503. Hermes's template registry describes a SQLite fallback; this starter does not include one.
- Add packages only to `pyproject.toml` and keep `uv.lock` in step (`uv lock`). The preview and build have no internet access, so packages outside the approved lock cannot be installed.
- Keep the probe routes. `/readyz` must not report ready when the database is down.
- Run `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright` and `uv run pytest` before you call the work done.

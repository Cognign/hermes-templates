---
id: fastapi-crud
version: 1.0.0
summary: A FastAPI service with SQLAlchemy 2, Alembic migrations, health and readiness probes.
use_when: The app is a Python JSON API that stores its own data in a database (SQLite in preview, PostgreSQL when published), with or without a separate frontend.
---

# FastAPI starter

FastAPI, SQLAlchemy 2 and Alembic. `GET /healthz` and `GET /readyz` already work. `README.md` explains the rules and commands.

The database is ready to use. In preview the app stores data in a SQLite file at `$DATA_DIR/app.db`. That data does not carry over to the published app. When you publish, Hermes gives the app its own empty PostgreSQL database through `DATABASE_URL`, and publishing is refused on an install that has no app database server. The same migrations run on both, and the app applies them every time it starts. Write code that works on both: use SQLAlchemy models, not raw SQL, and do not rely on PostgreSQL-only types or functions.

The page must send JSON with `fetch`. Do not post HTML forms: reading them needs `python-multipart`, which is not in the approved package set.

## Add one feature

1. **Table:** add a model class that extends `Base` (from `app/db.py`) in a new file under `app/`, for example `app/models.py`.
2. **Migration:** add the next file in `migrations/versions/` (the baseline is `0001_baseline`) with `revision` and `down_revision` set. Do not edit `0001_baseline.py`. If you use `alembic revision --autogenerate`, import your model module in `migrations/env.py` first so it sees the table.
3. **Routes:** add an `APIRouter` in a new file such as `app/routes.py`. Take a session with `Depends(get_db_session)` from `app/db.py`. Check input with Pydantic models. Register the router in `app/main.py` with `app.include_router(...)`.
4. **Test:** add a test in `tests/` that uses `TestClient(app)`.
5. **Stop** when the code and the test are in place.

## Rules

- `DATABASE_URL` is optional outside production. Without it the app uses SQLite under `DATA_DIR` (default `./.data`). With `APP_ENV=production` it is required and the app refuses to start without it. Read it from the environment only. Never commit it.
- In a migration that changes an existing table, use `op.batch_alter_table(...)` so it also runs on SQLite.
- Add packages only to `pyproject.toml` and keep `uv.lock` in step (`uv lock`). The preview and build have no internet access, so packages outside the approved lock cannot be installed.
- Keep the probe routes. `/readyz` must not report ready when the database is down or not migrated.
- Run `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright` and `uv run pytest` before you call the work done.

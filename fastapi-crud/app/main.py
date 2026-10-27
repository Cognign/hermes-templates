"""Main FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.db import MigrationError, check_db_connection, get_engine, run_migrations
from app.settings import PRODUCTION_NEEDS_DATABASE_URL, get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    try:
        get_settings()
    except ValidationError as error:
        # Only our own sentence is repeated; other causes can carry secret paths.
        if any(PRODUCTION_NEEDS_DATABASE_URL in e["msg"] for e in error.errors()):
            raise RuntimeError(
                f"Invalid application settings: {PRODUCTION_NEEDS_DATABASE_URL}"
            ) from None
        raise RuntimeError(
            "Invalid application settings (APP_ENV, DATABASE_URL, DATABASE_URL_FILE)"
        ) from None
    try:
        run_migrations()
    except MigrationError:
        raise
    except Exception as error:
        # Settings or engine setup failed; the cause can carry connection details.
        raise RuntimeError(
            f"Database migration failed while preparing ({type(error).__name__})"
        ) from None
    yield


app = FastAPI(title="Hermes App Template", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe: confirms the application process is running."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz() -> Response:
    """Readiness probe: the database is reachable and migrated to the latest revision.

    Returns HTTP 503 otherwise. Never fakes success.
    """
    try:
        if not check_db_connection(get_engine()):
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "not_ready",
                    "reason": "Database connection check failed",
                },
            )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "reason": "Database connection error",
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"status": "ready", "database": "connected"},
    )

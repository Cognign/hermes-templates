"""Main FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.db import check_db_connection, get_engine, run_migrations
from app.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    try:
        get_settings()
    except ValidationError:
        raise RuntimeError(
            "Invalid application settings (APP_ENV, DATABASE_URL, DATABASE_URL_FILE)"
        ) from None
    try:
        run_migrations()
    except Exception as error:
        # The cause can carry connection details, so only its type is shown.
        raise RuntimeError(
            f"Database migration failed ({type(error).__name__})"
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

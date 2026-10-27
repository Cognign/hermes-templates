"""Main FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.db import check_db_connection, get_engine
from app.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    try:
        get_settings()
    except ValidationError:
        raise RuntimeError(
            "Invalid application settings (APP_ENV, DATABASE_URL, DATABASE_URL_FILE)"
        ) from None
    yield


app = FastAPI(title="Hermes App Template", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe: confirms the application process is running."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz() -> Response:
    """Readiness probe: checks whether the application is ready to handle requests.

    Only checks database connectivity if DATABASE_URL is configured.
    Returns HTTP 503 if DATABASE_URL is unconfigured or unreachable.
    Never fakes success.
    """
    settings = get_settings()

    # Fail closed: never return success if the database is not configured
    if not settings.database_url:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "reason": "DATABASE_URL not configured",
            },
        )

    try:
        engine = get_engine(settings.database_url)
        if engine is None or not check_db_connection(engine):
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

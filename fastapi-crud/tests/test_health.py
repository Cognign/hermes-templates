"""Tests for application health, readiness, and settings fail-closed behavior."""

import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.settings import Settings, get_settings


def test_healthz_ok() -> None:
    """Liveness probe must return 200 with status ok."""
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readyz_503_when_database_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Readiness probe must return 503 if database connection fails."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/appdb")
    get_settings.cache_clear()

    with patch("app.main.check_db_connection", return_value=False):
        client = TestClient(app)
        response = client.get("/readyz")
        assert response.status_code == 503
        payload: dict[str, str] = response.json()
        assert payload["status"] == "not_ready"
        assert payload["reason"] == "Database connection check failed"


def test_readyz_200_when_database_connected(monkeypatch: pytest.MonkeyPatch) -> None:
    """Readiness probe must return 200 when database connectivity succeeds."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/appdb")
    get_settings.cache_clear()

    with (
        patch("app.main.get_engine", return_value=MagicMock()),
        patch("app.main.check_db_connection", return_value=True),
    ):
        client = TestClient(app)
        response = client.get("/readyz")
        assert response.status_code == 200
        payload: dict[str, str] = response.json()
        assert payload == {"status": "ready", "database": "connected"}


def test_startup_rejects_production_without_database_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(RuntimeError, match="Invalid application settings"):
        with TestClient(app):
            pytest.fail("Production startup accepted missing DATABASE_URL")


def test_uvicorn_startup_failure_does_not_log_secrets(tmp_path: Path) -> None:
    canary = "startup_secret_canary"
    result = subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "0"],
        env={
            **os.environ,
            "APP_ENV": "production",
            "DATABASE_URL": f"postgresql://u:{canary}@127.0.0.1:1/db",
            "BROKEN_SECRET_FILE": str(tmp_path / canary),
        },
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    output = result.stdout + result.stderr
    assert result.returncode == 3
    assert canary not in output
    assert "Invalid application settings" in output
    assert "ValidationError" not in output
    assert "input_value" not in output


def test_settings_errors_hide_input(tmp_path: Path) -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings.model_validate(
            {
                "database_url": "settings_secret_canary",
                "broken_file": str(tmp_path / "missing"),
            }
        )
    output = str(exc_info.value)
    assert "input_value" not in output
    assert "input_type" not in output
    assert "settings_secret_canary" not in output


def test_settings_fail_closed_in_production_without_database_url() -> None:
    """Production mode must strictly require DATABASE_URL (fail closed)."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(app_env="production", database_url=None)
    assert "DATABASE_URL is required in production mode" in str(exc_info.value)


def test_settings_development_without_database_url() -> None:
    """Development mode allows missing DATABASE_URL (SQLite is used instead)."""
    settings = Settings(app_env="development", database_url=None)
    assert settings.app_env == "development"
    assert settings.database_url is None


def test_settings_reads_secret_from_file(tmp_path: Path) -> None:
    """Secrets must be readable from file paths specified via *_FILE."""
    secret_file = tmp_path / "db_secret"
    secret_url = "postgresql://dbuser:supersecret@dbhost:5432/proddb"
    secret_file.write_text(secret_url, encoding="utf-8")

    settings = Settings(
        app_env="production",
        database_url=None,
        database_url_file=secret_file,
    )
    assert settings.database_url == secret_url


def test_settings_never_logs_secret_values() -> None:
    """String and repr representations of Settings must never leak secret values."""
    secret_url = "postgresql://dbuser:supersecret@dbhost:5432/proddb"
    settings = Settings(app_env="development", database_url=secret_url)

    rep = repr(settings)
    st = str(settings)
    assert "supersecret" not in rep
    assert "supersecret" not in st
    assert "configured" in rep


def test_alembic_baseline_revision_exists() -> None:
    """Alembic configuration must discover the 0001_baseline migration revision."""
    from alembic.script import ScriptDirectory

    from app.db import alembic_config

    script = ScriptDirectory.from_config(alembic_config())
    revisions = list(script.walk_revisions())
    assert len(revisions) == 1
    assert revisions[0].revision == "0001_baseline"

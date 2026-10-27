"""Database choice, migrations and readiness on SQLite and PostgreSQL."""

import os
import stat
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import get_engine
from app.main import app
from app.settings import Settings, get_settings


def test_preview_uses_sqlite_file_in_data_dir(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    settings = Settings(app_env="preview", data_dir=data_dir)
    assert settings.effective_database_url == f"sqlite:///{data_dir.resolve()}/app.db"
    assert stat.S_IMODE(data_dir.stat().st_mode) == 0o700


def test_data_dir_defaults_to_dot_data(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("DATA_DIR")
    monkeypatch.chdir(tmp_path)
    url = Settings().effective_database_url
    assert url == f"sqlite:///{(tmp_path / '.data' / 'app.db').resolve()}"


def test_app_env_is_trimmed_and_case_insensitive() -> None:
    with pytest.raises(ValueError, match="DATABASE_URL is required"):
        Settings(app_env=" Production ")  # pyright: ignore[reportArgumentType]


def test_production_without_database_url_refuses_to_start(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("APP_ENV", " PRODUCTION ")
    with pytest.raises(RuntimeError, match="Invalid application settings"):
        with TestClient(app):
            pytest.fail("Production startup accepted missing DATABASE_URL")
    assert not (tmp_path / "data").exists()


def test_database_url_wins_over_sqlite(monkeypatch: pytest.MonkeyPatch) -> None:
    url = "postgresql://user:pass@localhost:5432/appdb"
    monkeypatch.setenv("DATABASE_URL", url)
    get_settings.cache_clear()
    assert get_engine().dialect.name == "postgresql"
    assert not Path(os.environ["DATA_DIR"]).exists()


def test_startup_migrates_sqlite_and_readyz_is_ready() -> None:
    with TestClient(app) as client:
        response = client.get("/readyz")
        assert response.status_code == 200
        assert response.json() == {"status": "ready", "database": "connected"}
        with get_engine().connect() as conn:
            version = conn.execute(text("SELECT version_num FROM alembic_version"))
            assert version.scalar_one() == "0001_baseline"
        assert (Path(os.environ["DATA_DIR"]) / "app.db").is_file()


def test_readyz_503_when_sqlite_is_not_migrated() -> None:
    response = TestClient(app).get("/readyz")
    assert response.status_code == 503
    assert response.json()["reason"] == "Database connection check failed"


def test_sqlite_data_survives_a_restart() -> None:
    with TestClient(app):
        with get_engine().begin() as conn:
            conn.execute(text("CREATE TABLE notes (body TEXT)"))
            conn.execute(text("INSERT INTO notes VALUES ('kept')"))
    get_engine().dispose()
    with TestClient(app) as client:
        assert client.get("/readyz").status_code == 200
        with get_engine().connect() as conn:
            assert conn.execute(text("SELECT body FROM notes")).scalar_one() == "kept"


@pytest.mark.skipif(
    "TEST_DATABASE_URL" not in os.environ, reason="needs a PostgreSQL server"
)
def test_startup_migrates_postgresql(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", os.environ["TEST_DATABASE_URL"])
    get_settings.cache_clear()
    with TestClient(app) as client:
        assert client.get("/readyz").status_code == 200
        with get_engine().connect() as conn:
            version = conn.execute(text("SELECT version_num FROM alembic_version"))
            assert version.scalar_one() == "0001_baseline"
    assert not Path(os.environ["DATA_DIR"]).exists()

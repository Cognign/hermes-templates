"""Database choice, migrations and readiness on SQLite and PostgreSQL."""

import os
import stat
import subprocess
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, text

from app.db import (
    MIGRATION_LOCK_ID,
    MigrationError,
    check_db_connection,
    get_engine,
    run_migrations,
)
from app.main import app
from app.settings import Settings, get_settings


def test_preview_uses_sqlite_file_in_data_dir(tmp_path: Path) -> None:
    data_dir = tmp_path / "data"
    settings = Settings(app_env="preview", data_dir=data_dir)
    assert settings.effective_database_url == URL.create(
        "sqlite", database=f"{data_dir.resolve()}/app.db"
    )
    assert stat.S_IMODE(data_dir.stat().st_mode) == 0o700


@pytest.mark.parametrize("name", ["q?x", "a#b", "50%25", "with space", "a?b#c%d e"])
def test_sqlite_file_stays_inside_data_dir_with_special_characters(
    tmp_path: Path, name: str
) -> None:
    data_dir = tmp_path / name / "data"
    settings = Settings(app_env="preview", data_dir=data_dir)
    with get_engine(settings.effective_database_url).begin() as conn:
        conn.execute(text("CREATE TABLE t (x INTEGER)"))
    assert (data_dir / "app.db").stat().st_size > 0
    assert sorted(p.name for p in tmp_path.iterdir()) == [name]


def test_database_file_is_private_even_when_data_dir_already_exists(
    tmp_path: Path,
) -> None:
    data_dir = tmp_path / "shared"
    data_dir.mkdir(mode=0o755)
    data_dir.chmod(0o755)
    Settings(app_env="preview", data_dir=data_dir).effective_database_url  # noqa: B018
    assert stat.S_IMODE((data_dir / "app.db").stat().st_mode) == 0o600
    assert stat.S_IMODE(data_dir.stat().st_mode) == 0o755
    run_migrations_in_data_dir = get_engine(
        Settings(app_env="preview", data_dir=data_dir).effective_database_url
    )
    with run_migrations_in_data_dir.begin() as conn:
        conn.execute(text("CREATE TABLE t (x INTEGER)"))
    for side_file in data_dir.iterdir():
        if side_file.name.startswith("app.db"):
            assert stat.S_IMODE(side_file.stat().st_mode) == 0o600, side_file.name


def test_data_dir_defaults_to_dot_data(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("DATA_DIR")
    monkeypatch.chdir(tmp_path)
    url = Settings().effective_database_url
    assert url == URL.create(
        "sqlite", database=str((tmp_path / ".data" / "app.db").resolve())
    )


def test_app_env_is_trimmed_and_case_insensitive() -> None:
    with pytest.raises(ValueError, match="DATABASE_URL is required when APP_ENV"):
        Settings(app_env=" Production ")  # pyright: ignore[reportArgumentType]


def test_production_without_database_url_refuses_to_start(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("APP_ENV", " PRODUCTION ")
    with pytest.raises(
        RuntimeError,
        match="DATABASE_URL is required when APP_ENV is production",
    ):
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


def test_readyz_is_ready_when_database_is_from_a_newer_release() -> None:
    with TestClient(app) as client:
        with get_engine().begin() as conn:
            conn.execute(text("UPDATE alembic_version SET version_num='9999_future'"))
        assert client.get("/readyz").status_code == 200


def test_readyz_503_when_database_is_reachable_but_empty() -> None:
    with get_engine().begin() as conn:
        conn.execute(text("CREATE TABLE other (x INTEGER)"))
    assert check_db_connection(get_engine()) is False


def test_migration_failure_names_the_step_without_secrets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    canary = "migration_secret_canary"
    monkeypatch.setenv("DATABASE_URL", f"postgresql://u:{canary}@127.0.0.1:1/db")
    get_settings.cache_clear()
    with pytest.raises(MigrationError) as info:
        run_migrations()
    message = str(info.value)
    assert message == (
        "Database migration failed while taking the migration lock (OperationalError)"
    )
    assert canary not in message
    assert "127.0.0.1" not in message


def test_sqlite_upgrade_failure_names_the_step_without_secrets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def broken(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("upgrade_secret_canary /private/path")

    monkeypatch.setattr("app.db.command.upgrade", broken)
    with pytest.raises(MigrationError) as info:
        run_migrations()
    assert str(info.value) == (
        "Database migration failed while applying migrations (RuntimeError)"
    )


RACE_SCRIPT = """
import sys, time
from app.db import run_migrations
while time.time() < float(sys.argv[1]):
    pass
run_migrations()
"""


def race_eight_processes() -> list[subprocess.CompletedProcess[str]]:
    start = str(time.time() + 3)
    procs = [
        subprocess.Popen(
            [sys.executable, "-c", RACE_SCRIPT, start],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        for _ in range(8)
    ]
    results: list[subprocess.CompletedProcess[str]] = []
    for proc in procs:
        out, _ = proc.communicate(timeout=120)
        results.append(subprocess.CompletedProcess(proc.args, proc.returncode, out))
    return results


def assert_migrated_once(results: list[subprocess.CompletedProcess[str]]) -> None:
    assert [r.returncode for r in results] == [0] * 8, [r.stdout for r in results]
    upgrades = sum(r.stdout.count("Running upgrade") for r in results)
    assert upgrades == 1


def test_eight_processes_migrate_sqlite_once() -> None:
    assert_migrated_once(race_eight_processes())
    with get_engine().connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version"))
        assert version.scalar_one() == "0001_baseline"


@pytest.mark.skipif(
    "TEST_DATABASE_URL" not in os.environ, reason="needs a PostgreSQL server"
)
def test_eight_processes_migrate_postgresql_once(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", os.environ["TEST_DATABASE_URL"])
    get_settings.cache_clear()
    with get_engine().begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    assert_migrated_once(race_eight_processes())


@pytest.mark.skipif(
    "TEST_DATABASE_URL" not in os.environ, reason="needs a PostgreSQL server"
)
def test_postgresql_lock_is_released_while_the_process_keeps_running(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", os.environ["TEST_DATABASE_URL"])
    get_settings.cache_clear()
    run_migrations()
    with get_engine().connect() as other:
        taken = other.execute(
            text("SELECT pg_try_advisory_lock(:id)"), {"id": MIGRATION_LOCK_ID}
        ).scalar_one()
        other.execute(text("SELECT pg_advisory_unlock_all()"))
    assert taken is True


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

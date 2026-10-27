"""Database choice, migrations and readiness on SQLite and PostgreSQL."""

import fcntl
import logging
import os
import stat
import subprocess
import sys
import time
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import URL, Connection, text

from app import db as app_db
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
    url = settings.effective_database_url
    assert url == URL.create("sqlite", database=f"{data_dir.resolve()}/app.db")
    assert not data_dir.exists()
    get_engine(url)
    assert stat.S_IMODE(data_dir.stat().st_mode) == 0o700
    assert stat.S_IMODE((data_dir / "app.db").stat().st_mode) == 0o600


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
    get_engine(Settings(app_env="preview", data_dir=data_dir).effective_database_url)
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


def test_repeated_engine_lookups_do_no_file_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    get_engine()
    calls: list[str] = []
    real_open, real_chmod, real_mkdir = os.open, os.chmod, Path.mkdir
    monkeypatch.setattr(
        os, "open", lambda *a, **k: (calls.append("open"), real_open(*a, **k))[1]
    )
    monkeypatch.setattr(Path, "chmod", lambda *a, **k: calls.append("chmod"))
    monkeypatch.setattr(
        Path, "mkdir", lambda *a, **k: (calls.append("mkdir"), real_mkdir(*a, **k))[1]
    )
    monkeypatch.setattr(
        os, "chmod", lambda *a, **k: (calls.append("oschmod"), real_chmod(*a, **k))[1]
    )
    for _ in range(100):
        get_engine()
        get_settings().effective_database_url  # noqa: B018
    assert calls == []


def test_data_dir_defaults_to_dot_data(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("DATA_DIR")
    monkeypatch.chdir(tmp_path)
    url = Settings().effective_database_url
    get_engine(url)
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


class Messages(logging.Handler):
    """Collects app.db log lines. caplog loses its handler once Alembic runs
    fileConfig, which replaces the root logger's handlers."""

    def __init__(self) -> None:
        super().__init__(logging.INFO)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.lines.append(record.getMessage())


@pytest.fixture
def db_log() -> Generator[Messages]:
    handler = Messages()
    logger = logging.getLogger("app.db")
    logger.addHandler(handler)
    previous = logger.level
    logger.setLevel(logging.INFO)
    yield handler
    logger.removeHandler(handler)
    logger.setLevel(previous)


def sqlite_lock_path() -> Path:
    return Path(os.environ["DATA_DIR"]) / "app.db.lock"


def test_sqlite_lock_file_is_private_and_released_after_success() -> None:
    run_migrations()
    assert stat.S_IMODE(sqlite_lock_path().stat().st_mode) == 0o600
    fd = os.open(sqlite_lock_path(), os.O_RDWR)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    finally:
        os.close(fd)


def test_sqlite_lock_is_released_after_an_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def broken(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr("app.db.command.upgrade", broken)
    with pytest.raises(MigrationError):
        run_migrations()
    fd = os.open(sqlite_lock_path(), os.O_RDWR)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    finally:
        os.close(fd)


def test_sqlite_lock_wait_logs_once_then_times_out(
    monkeypatch: pytest.MonkeyPatch, db_log: Messages
) -> None:
    run_migrations()
    monkeypatch.setattr(app_db, "MIGRATION_LOCK_TIMEOUT_SECONDS", 0.5)
    monkeypatch.setattr(app_db, "MIGRATION_LOCK_POLL_SECONDS", 0.05)
    holder = os.open(sqlite_lock_path(), os.O_RDWR)
    fcntl.flock(holder, fcntl.LOCK_EX)
    try:
        with pytest.raises(MigrationError) as info:
            run_migrations()
    finally:
        os.close(holder)
    assert str(info.value) == "Timed out waiting for the migration lock"
    waiting = [m for m in db_log.lines if "Waiting for another copy" in m]
    assert len(waiting) == 1


def test_sqlite_lock_waits_then_proceeds_when_released(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run_migrations()
    monkeypatch.setattr(app_db, "MIGRATION_LOCK_POLL_SECONDS", 0.05)
    holder = os.open(sqlite_lock_path(), os.O_RDWR)
    fcntl.flock(holder, fcntl.LOCK_EX)
    real_sleep = time.sleep

    def release_on_first_sleep(seconds: float) -> None:
        os.close(holder)
        monkeypatch.setattr(time, "sleep", real_sleep)

    monkeypatch.setattr(time, "sleep", release_on_first_sleep)
    run_migrations()


def test_sqlite_lock_file_descriptor_is_closed_when_flock_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opened: list[int] = []
    real_open = os.open

    def tracking_open(path: str | Path, *args: int) -> int:
        fd = real_open(path, *args)
        if str(path).endswith(".lock"):
            opened.append(fd)
        return fd

    def broken_flock(*_args: object) -> None:
        raise OSError("flock failed")

    monkeypatch.setattr(os, "open", tracking_open)
    monkeypatch.setattr(fcntl, "flock", broken_flock)
    with pytest.raises(MigrationError) as info:
        run_migrations()
    assert str(info.value) == (
        "Database migration failed while taking the migration lock (OSError)"
    )
    assert len(opened) == 1
    with pytest.raises(OSError):
        os.fstat(opened[0])


def test_sqlite_lock_file_descriptor_is_closed_when_chmod_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opened: list[int] = []
    real_open = os.open

    def tracking_open(path: str | Path, *args: int) -> int:
        fd = real_open(path, *args)
        if str(path).endswith(".lock"):
            opened.append(fd)
        return fd

    def broken_chmod(path: str | Path, *_args: int, **_kwargs: object) -> None:
        if str(path).endswith(".lock"):
            raise PermissionError("no")

    monkeypatch.setattr(os, "open", tracking_open)
    monkeypatch.setattr(os, "chmod", broken_chmod)
    with pytest.raises(MigrationError):
        run_migrations()
    with pytest.raises(OSError):
        os.fstat(opened[0])


def test_database_at_a_newer_revision_starts_without_upgrading(
    db_log: Messages,
) -> None:
    run_migrations()
    with get_engine().begin() as conn:
        conn.execute(text("UPDATE alembic_version SET version_num='9999_future'"))
    with TestClient(app) as client:
        assert client.get("/readyz").status_code == 200
    ahead = [m for m in db_log.lines if "newer revision" in m]
    assert len(ahead) == 1
    with get_engine().connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version"))
        assert version.scalar_one() == "9999_future"


def use_postgresql(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", os.environ["TEST_DATABASE_URL"])
    get_settings.cache_clear()


needs_postgresql = pytest.mark.skipif(
    "TEST_DATABASE_URL" not in os.environ, reason="needs a PostgreSQL server"
)


@needs_postgresql
def test_postgresql_database_at_a_newer_revision_starts_without_upgrading(
    monkeypatch: pytest.MonkeyPatch, db_log: Messages
) -> None:
    use_postgresql(monkeypatch)
    run_migrations()
    with get_engine().begin() as conn:
        conn.execute(text("UPDATE alembic_version SET version_num='9999_future'"))
    try:
        with TestClient(app) as client:
            assert client.get("/readyz").status_code == 200
        assert len([m for m in db_log.lines if "newer revision" in m]) == 1
        with get_engine().connect() as conn:
            version = conn.execute(text("SELECT version_num FROM alembic_version"))
            assert version.scalar_one() == "9999_future"
    finally:
        with get_engine().begin() as conn:
            conn.execute(text("UPDATE alembic_version SET version_num='0001_baseline'"))


@needs_postgresql
def test_postgresql_lock_wait_logs_once_then_times_out(
    monkeypatch: pytest.MonkeyPatch, db_log: Messages
) -> None:
    use_postgresql(monkeypatch)
    monkeypatch.setattr(app_db, "MIGRATION_LOCK_TIMEOUT_SECONDS", 0.5)
    monkeypatch.setattr(app_db, "MIGRATION_LOCK_POLL_SECONDS", 0.05)
    holder = get_engine().connect()
    try:
        holder.execute(text("SELECT pg_advisory_lock(:id)"), {"id": MIGRATION_LOCK_ID})
        with pytest.raises(MigrationError) as info:
            run_migrations()
    finally:
        holder.execute(text("SELECT pg_advisory_unlock_all()"))
        holder.close()
    assert str(info.value) == "Timed out waiting for the migration lock"
    waiting = [m for m in db_log.lines if "Waiting for another copy" in m]
    assert len(waiting) == 1


@needs_postgresql
def test_postgresql_lock_connection_is_closed_when_taking_the_lock_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    use_postgresql(monkeypatch)
    engine = get_engine()
    opened: list[Connection] = []
    real_connect = engine.connect

    def tracking_connect() -> Connection:
        conn = real_connect()
        opened.append(conn)
        return conn

    def broken(_try_acquire: object) -> None:
        raise RuntimeError("lock failed")

    monkeypatch.setattr(engine, "connect", tracking_connect)
    monkeypatch.setattr(app_db, "_acquire_with_timeout", broken)
    with pytest.raises(MigrationError):
        run_migrations()
    assert len(opened) == 1
    assert opened[0].closed

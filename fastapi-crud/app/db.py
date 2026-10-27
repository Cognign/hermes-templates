"""Database engine and session management using SQLAlchemy 2."""

import fcntl
import logging
import os
import time
from collections.abc import Callable, Generator
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from alembic.script.revision import RevisionError
from sqlalchemy import URL, Engine, create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""


# Any 64-bit number; every copy of this app uses the same one.
MIGRATION_LOCK_ID = 742103422
MIGRATION_LOCK_TIMEOUT_SECONDS = 30.0
MIGRATION_LOCK_POLL_SECONDS = 0.1


def normalize_database_url(url: str | URL) -> str | URL:
    """Ensure standard PostgreSQL connection strings use the psycopg 3 driver."""
    if isinstance(url, URL):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


def prepare_sqlite_file(url: str | URL) -> None:
    """Create the folder (0700 if new) and the database file (always 0600).

    Does nothing for other databases or an in-memory SQLite.
    """
    parsed = make_url(url)
    if parsed.get_backend_name() != "sqlite" or not parsed.database:
        return
    path = Path(parsed.database)
    if parsed.database == ":memory:" or str(parsed.query.get("mode")) == "memory":
        return
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.close(os.open(path, os.O_CREAT | os.O_RDWR, 0o600))
    path.chmod(0o600)


@lru_cache
def _engine_for(url: str | URL) -> Engine:
    # Once per URL, not once per request: this is the only place that touches files.
    prepare_sqlite_file(url)
    engine = create_engine(url, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(dbapi_connection: object, _record: object) -> None:
            cursor = dbapi_connection.cursor()  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType, reportUnknownVariableType]
            cursor.execute("PRAGMA foreign_keys=ON")  # pyright: ignore[reportUnknownMemberType]
            cursor.close()  # pyright: ignore[reportUnknownMemberType]

    return engine


def get_engine(database_url: str | URL | None = None) -> Engine:
    """Return the cached engine for DATABASE_URL, or for the SQLite preview file."""
    url = database_url or get_settings().effective_database_url
    return _engine_for(normalize_database_url(url))


def alembic_config() -> Config:
    """Alembic config that does not depend on the current working directory."""
    root = Path(__file__).resolve().parent.parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return config


class MigrationError(RuntimeError):
    """A migration step failed. The text names the step and the error type only.

    The underlying error can carry the URL, host, user or password, so it is
    never copied into the message.
    """

    def __init__(self, step: str, error: BaseException) -> None:
        super().__init__(
            f"Database migration failed while {step} ({type(error).__name__})"
        )


class MigrationLockTimeoutError(MigrationError):
    """Another copy held the migration lock for longer than the limit."""

    def __init__(self) -> None:
        RuntimeError.__init__(self, "Timed out waiting for the migration lock")


def _acquire_with_timeout(try_acquire: Callable[[], bool]) -> None:
    """Poll until try_acquire succeeds; log once while waiting, give up at the limit."""
    deadline = time.monotonic() + MIGRATION_LOCK_TIMEOUT_SECONDS
    announced = False
    while not try_acquire():
        if time.monotonic() >= deadline:
            raise MigrationLockTimeoutError
        if not announced:
            logger.warning("Waiting for another copy to finish migrating the database")
            announced = True
        time.sleep(MIGRATION_LOCK_POLL_SECONDS)


@contextmanager
def _migration_lock(engine: Engine) -> Generator[None]:
    """One process at a time migrates: pg_advisory_lock, or a lock file on SQLite."""
    if engine.dialect.name == "postgresql":
        conn = None
        try:
            conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")
            held = conn

            def try_acquire() -> bool:
                return bool(
                    held.execute(
                        text("SELECT pg_try_advisory_lock(:id)"),
                        {"id": MIGRATION_LOCK_ID},
                    ).scalar_one()
                )

            _acquire_with_timeout(try_acquire)
        except MigrationLockTimeoutError:
            if conn is not None:
                conn.close()
            raise
        except Exception as error:
            if conn is not None:
                conn.close()
            raise MigrationError("taking the migration lock", error) from None
        try:
            yield
        finally:
            # close() would only return the connection to the pool and keep the
            # lock for the life of the process.
            try:
                conn.execute(
                    text("SELECT pg_advisory_unlock(:id)"), {"id": MIGRATION_LOCK_ID}
                )
            finally:
                conn.close()
    elif engine.dialect.name == "sqlite" and engine.url.database:
        lock_path = f"{engine.url.database}.lock"
        fd = -1
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
            os.chmod(lock_path, 0o600)
            _acquire_with_timeout(lambda: _try_flock(fd))
        except MigrationLockTimeoutError:
            os.close(fd)
            raise
        except Exception as error:
            if fd >= 0:
                os.close(fd)
            raise MigrationError("taking the migration lock", error) from None
        try:
            yield
        finally:
            os.close(fd)  # closing the file releases the lock
    else:
        yield


def _try_flock(fd: int) -> bool:
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return False
    return True


def _database_is_ahead(engine: Engine) -> bool:
    """True when the database is at a revision this code does not know.

    That happens after a rollback: a newer release already migrated it.
    """
    with engine.connect() as conn:
        current = MigrationContext.configure(conn).get_current_heads()
    if not current:
        return False
    script = ScriptDirectory.from_config(alembic_config())
    try:
        list(script.iterate_revisions(current, "base"))
    except RevisionError:
        return True
    return False


def run_migrations() -> None:
    """Apply the committed migrations, one process at a time.

    Safe to call from several processes at once: the others wait up to 30
    seconds, then find nothing left to apply. A database already migrated by a
    newer release is left alone, so a rolled-back release keeps serving.
    """
    engine = get_engine()
    with _migration_lock(engine):
        try:
            if _database_is_ahead(engine):
                logger.warning(
                    "The database is at a newer revision than this version of "
                    "the app knows; starting without migrating"
                )
                return
            command.upgrade(alembic_config(), "head")
        except Exception as error:
            raise MigrationError("applying migrations", error) from None


def get_session_factory(engine: Engine | None = None) -> sessionmaker[Session]:
    """Return a sessionmaker bound to the given or cached engine."""
    return sessionmaker(bind=engine or get_engine(), autoflush=False, autocommit=False)


def get_db_session() -> Generator[Session]:
    """Dependency for obtaining a scoped database session."""
    with get_session_factory()() as session:
        yield session


def check_db_connection(engine: Engine) -> bool:
    """Check the database is reachable and migrated to the latest revision."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            current = MigrationContext.configure(conn).get_current_heads()
        return _applied_everything_known(current)
    except Exception:
        return False


def _applied_everything_known(current_heads: tuple[str, ...]) -> bool:
    """True when every migration in this code is applied.

    A database at a revision this code does not know was migrated by a newer
    release, which includes all older migrations, so it is still ready.
    """
    if not current_heads:
        return False
    script = ScriptDirectory.from_config(alembic_config())
    try:
        applied = {
            revision.revision
            for revision in script.iterate_revisions(current_heads, "base")
        }
    except RevisionError:
        return True
    return set(script.get_heads()) <= applied

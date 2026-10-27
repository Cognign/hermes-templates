"""Database engine and session management using SQLAlchemy 2."""

import fcntl
import os
from collections.abc import Generator
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from alembic.script.revision import RevisionError
from sqlalchemy import URL, Engine, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""


# Any 64-bit number; every copy of this app uses the same one.
MIGRATION_LOCK_ID = 742103422


def normalize_database_url(url: str | URL) -> str | URL:
    """Ensure standard PostgreSQL connection strings use the psycopg 3 driver."""
    if isinstance(url, URL):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


@lru_cache
def _engine_for(url: str | URL) -> Engine:
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


@contextmanager
def _migration_lock(engine: Engine) -> Generator[None]:
    """One process at a time migrates: pg_advisory_lock, or a lock file on SQLite."""
    if engine.dialect.name == "postgresql":
        try:
            conn = engine.connect().execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(
                text("SELECT pg_advisory_lock(:id)"), {"id": MIGRATION_LOCK_ID}
            )
        except Exception as error:
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
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_RDWR, 0o600)
            os.chmod(lock_path, 0o600)
            fcntl.flock(fd, fcntl.LOCK_EX)
        except Exception as error:
            raise MigrationError("taking the migration lock", error) from None
        try:
            yield
        finally:
            os.close(fd)  # closing the file releases the lock
    else:
        yield


def run_migrations() -> None:
    """Apply the committed migrations, one process at a time.

    Safe to call from several processes at once: the others wait, then find
    nothing left to apply.
    """
    with _migration_lock(get_engine()):
        try:
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

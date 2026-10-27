"""Database engine and session management using SQLAlchemy 2."""

from collections.abc import Generator
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""


def normalize_database_url(url: str) -> str:
    """Ensure standard PostgreSQL connection strings use the psycopg 3 driver."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


@lru_cache
def _engine_for(url: str) -> Engine:
    engine = create_engine(url, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(dbapi_connection: object, _record: object) -> None:
            cursor = dbapi_connection.cursor()  # pyright: ignore[reportAttributeAccessIssue, reportUnknownMemberType, reportUnknownVariableType]
            cursor.execute("PRAGMA foreign_keys=ON")  # pyright: ignore[reportUnknownMemberType]
            cursor.close()  # pyright: ignore[reportUnknownMemberType]

    return engine


def get_engine(database_url: str | None = None) -> Engine:
    """Return the cached engine for DATABASE_URL, or for the SQLite preview file."""
    url = database_url or get_settings().effective_database_url
    return _engine_for(normalize_database_url(url))


def alembic_config() -> Config:
    """Alembic config that does not depend on the current working directory."""
    root = Path(__file__).resolve().parent.parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return config


def run_migrations() -> None:
    """Apply the committed migrations to the configured database."""
    command.upgrade(alembic_config(), "head")


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
            current = MigrationContext.configure(conn).get_current_revision()
        return (
            current == ScriptDirectory.from_config(alembic_config()).get_current_head()
        )
    except Exception:
        return False

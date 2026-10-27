"""Database engine and session management using SQLAlchemy 2."""

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
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
def get_engine(database_url: str | None = None) -> Engine | None:
    """Create and cache the SQLAlchemy engine.

    Returns None if no database_url is provided and none is in settings.
    """
    if database_url is None:
        settings = get_settings()
        database_url = settings.database_url

    if not database_url:
        return None

    normalized_url = normalize_database_url(database_url)
    return create_engine(
        normalized_url,
        pool_pre_ping=True,
    )


def get_session_factory(engine: Engine | None = None) -> sessionmaker[Session] | None:
    """Return a sessionmaker bound to the given or cached engine."""
    target_engine = engine or get_engine()
    if target_engine is None:
        return None
    return sessionmaker(bind=target_engine, autoflush=False, autocommit=False)


def get_db_session() -> Generator[Session]:
    """Dependency for obtaining a scoped database session."""
    factory = get_session_factory()
    if factory is None:
        raise RuntimeError("Database connection is not configured")
    with factory() as session:
        yield session


def check_db_connection(engine: Engine) -> bool:
    """Check database reachability by executing a lightweight SELECT 1 query."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

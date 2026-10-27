"""Alembic environment configuration for database migrations."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import URL, create_engine, pool
from sqlalchemy.engine import make_url

from app.db import Base, normalize_database_url
from app.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def get_url() -> str | URL:
    """Resolve the database URL (PostgreSQL, or SQLite in preview)."""
    return normalize_database_url(get_settings().effective_database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode emitting SQL directly."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=make_url(url).get_backend_name() == "sqlite",
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against a live database connection."""
    connectable = create_engine(get_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=connection.dialect.name == "sqlite",
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

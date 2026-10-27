"""Application settings loaded using pydantic-settings.

Follows a fail-closed model:
- DATABASE_URL is strictly required in production mode.
- Secrets can be read from env or *_FILE paths.
- Secret values are never logged or exposed via string representations.
"""

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["preview", "production", "development"]


class Settings(BaseSettings):
    """Application configuration and secrets."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    app_env: AppEnv = "development"
    database_url: str | None = Field(default=None, repr=False)
    database_url_file: Path | None = Field(default=None, repr=False)

    @model_validator(mode="before")
    @classmethod
    def resolve_file_secrets(cls, data: object) -> dict[str, object]:
        """Read secrets from file paths if specified via *_FILE env vars or keys."""
        normalized: dict[str, object] = {}
        if isinstance(data, dict):
            raw_items: list[tuple[object, object]] = list(data.items())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
            for k, v in raw_items:
                if isinstance(k, str):
                    normalized[k] = v

        # 1. Read secrets from environment variables ending with _FILE
        for env_key, file_path_str in os.environ.items():
            if env_key.endswith("_FILE") and file_path_str:
                target_key = env_key[:-5].lower()
                if not normalized.get(target_key):
                    file_path = Path(file_path_str)
                    if not file_path.is_file():
                        raise ValueError(
                            f"Secret file for {env_key} does not exist: {file_path_str}"
                        )
                    normalized[target_key] = file_path.read_text(
                        encoding="utf-8"
                    ).strip()

        # 2. Read secrets if passed via dict keys ending with _file
        for k, v in list(normalized.items()):
            if k.endswith("_file") and v:
                target_key = k[:-5]
                if not normalized.get(target_key):
                    file_path = Path(str(v))
                    if not file_path.is_file():
                        raise ValueError(
                            f"Secret file for {k} does not exist: {file_path}"
                        )
                    normalized[target_key] = file_path.read_text(
                        encoding="utf-8"
                    ).strip()

        return normalized

    @model_validator(mode="after")
    def validate_fail_closed(self) -> Self:
        """Enforce fail-closed rules for environments."""
        if self.database_url_file and not self.database_url:
            if not self.database_url_file.is_file():
                raise ValueError(
                    f"Secret file does not exist: {self.database_url_file}"
                )
            self.database_url = self.database_url_file.read_text(
                encoding="utf-8"
            ).strip()

        if self.app_env == "production" and not self.database_url:
            raise ValueError("DATABASE_URL is required in production mode")
        return self

    def __repr__(self) -> str:
        """Never expose secret values in representations."""
        db_state = "configured" if self.database_url else "not_configured"
        return f"Settings(app_env={self.app_env!r}, database_url={db_state})"

    def __str__(self) -> str:
        """Never expose secret values in string formatting."""
        return self.__repr__()


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton instance of application settings."""
    return Settings()

"""Centralized application configuration via Pydantic settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All values have sensible defaults and can be overridden with env vars
    or a `.env` file in the backend directory.

    Example .env:
        HOST=0.0.0.0
        PORT=8080
        DATABASE_PATH=dispenser.db
        ESP32_URL=http://192.168.1.42
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Flask server
    host: str = "0.0.0.0"  # noqa: S104
    port: int = 5000
    debug: bool = True

    # Database
    database_path: str = "dispenser.db"

    # ESP32 hardware
    esp32_url: str = "http://esp32.local"
    esp32_status_timeout: float = 1.0
    esp32_dispense_timeout: float = 2.0

    # Dispense limits
    max_dispense_ml: int = 60


settings = Settings()

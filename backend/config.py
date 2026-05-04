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
    port: int = 8080
    debug: bool = True

    # Database
    database_path: str = "dispenser.db"

    # ESP32 hardware
    esp32_url: str = "http://esp32.local"
    # Optional: pin the ESP32's IP to fully bypass mDNS/.local resolution. If
    # set, takes precedence over esp32_url. Useful when the host's mDNS
    # resolver is slow or unreliable. Pair with a DHCP reservation.
    esp32_ip: str | None = None
    esp32_status_timeout: float = 1.0
    esp32_dispense_timeout: float = 2.0
    mock_esp32: bool = False

    # Dispense limits
    max_dispense_ml: int = 60


settings = Settings()

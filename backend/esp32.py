"""ESP32 hardware communication layer."""

from __future__ import annotations

import logging
import time

import requests

from config import settings

logger = logging.getLogger(__name__)


def fetch_status() -> dict:
    """Fetch the current status from the ESP32 hardware."""
    resp = requests.get(
        f"{settings.esp32_url}/status",
        timeout=settings.esp32_status_timeout,
    )
    return resp.json()


def send_dispense(amount_ml: int) -> requests.Response:
    """Send a dispense command to the ESP32."""
    return requests.post(
        f"{settings.esp32_url}/dispense",
        json={"amount_ml": amount_ml, "request_id": f"req_{int(time.time())}"},
        timeout=settings.esp32_dispense_timeout,
    )

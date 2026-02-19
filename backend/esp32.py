"""ESP32 hardware communication layer."""

from __future__ import annotations

import logging
import time

import requests

logger = logging.getLogger(__name__)

# ESP32 Configuration
URL = "http://esp32.local"
_STATUS_TIMEOUT = 1.0
_DISPENSE_TIMEOUT = 2.0


def fetch_status() -> dict:
    """Fetch the current status from the ESP32 hardware."""
    resp = requests.get(f"{URL}/status", timeout=_STATUS_TIMEOUT)
    return resp.json()


def send_dispense(amount_ml: int) -> requests.Response:
    """Send a dispense command to the ESP32."""
    return requests.post(
        f"{URL}/dispense",
        json={"amount_ml": amount_ml, "request_id": f"req_{int(time.time())}"},
        timeout=_DISPENSE_TIMEOUT,
    )

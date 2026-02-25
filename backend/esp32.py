"""ESP32 hardware communication layer."""

from __future__ import annotations

import logging
import time
from unittest.mock import MagicMock

import requests

from config import settings

logger = logging.getLogger(__name__)


# ─── Mock ESP32 ───────────────────────────────────────────────────────────────

class _MockState:
    """Simulated ESP32 state for local development without hardware."""

    glass_present: bool = True
    state: str = "idle"
    last_pour_ml: int = 0
    _start: float = time.time()

    def status(self) -> dict:
        return {
            "state": self.state,
            "glass_present": self.glass_present,
            "uptime": int(time.time() - self._start),
            "last_pour_ml": self.last_pour_ml,
        }


_mock = _MockState()


# ─── Public API ───────────────────────────────────────────────────────────────


def fetch_status() -> dict:
    """Fetch the current status from the ESP32 hardware (or mock)."""
    if settings.mock_esp32:
        logger.debug("[mock] Returning simulated ESP32 status")
        return _mock.status()

    resp = requests.get(
        f"{settings.esp32_url}/status",
        timeout=settings.esp32_status_timeout,
    )
    return resp.json()


def send_dispense(amount_ml: int) -> requests.Response:
    """Send a dispense command to the ESP32 (or mock)."""
    if settings.mock_esp32:
        logger.debug("[mock] Simulating dispense of %dml", amount_ml)
        _mock.last_pour_ml = amount_ml
        resp = MagicMock(spec=requests.Response)
        resp.status_code = 200
        return resp

    return requests.post(
        f"{settings.esp32_url}/dispense",
        json={"amount_ml": amount_ml, "request_id": f"req_{int(time.time())}"},
        timeout=settings.esp32_dispense_timeout,
    )

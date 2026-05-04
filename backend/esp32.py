"""ESP32 hardware communication layer."""

from __future__ import annotations

import logging
import socket
import threading
import time
from unittest.mock import MagicMock
from urllib.parse import urlparse, urlunparse

import requests
from requests.adapters import HTTPAdapter

from config import settings

logger = logging.getLogger(__name__)


# ─── HTTP session ─────────────────────────────────────────────────────────────
# A persistent Session enables HTTP keep-alive: subsequent requests reuse the
# same TCP connection (avoids handshake) and the same resolved IP (avoids the
# DNS / mDNS lookup, which can be multi-second on hosts where .local resolution
# falls through to unicast DNS).

_session = requests.Session()
_session.mount("http://", HTTPAdapter(pool_connections=1, pool_maxsize=2))


# ─── Status cache ─────────────────────────────────────────────────────────────
# Coalesce concurrent /status requests within a short window so that N browser
# tabs polling at 500ms only generate ~6 ESP32 round-trips per second total
# instead of 2N. Single-flight via lock + double-checked TTL.

_STATUS_TTL_S = 0.15
_status_cache: dict | None = None
_status_cache_at: float = 0.0
_status_lock = threading.Lock()


# ─── Resolved-URL cache ───────────────────────────────────────────────────────
# Cache the resolved IP for the ESP32 hostname so we only pay the .local
# resolution cost once. Invalidated on connection failure so DHCP renewals or
# device reboots that change the IP self-heal on the next request.

_cached_url: str | None = None


def _esp32_url() -> str:
    """Return the ESP32 base URL with the hostname pre-resolved to an IP."""
    global _cached_url

    if settings.esp32_ip:
        return f"http://{settings.esp32_ip}"

    if _cached_url:
        return _cached_url

    parsed = urlparse(settings.esp32_url)
    hostname = parsed.hostname or "esp32.local"
    try:
        ip = socket.gethostbyname(hostname)
        netloc = ip if not parsed.port else f"{ip}:{parsed.port}"
        _cached_url = urlunparse(parsed._replace(netloc=netloc))
        logger.info("[esp32] Resolved %s → %s", hostname, ip)
    except socket.gaierror as exc:
        logger.warning("[esp32] Could not resolve %s (%s) — using hostname directly", hostname, exc)
        _cached_url = settings.esp32_url

    return _cached_url


def _invalidate_url_cache() -> None:
    global _cached_url
    _cached_url = None


# ─── Mock ESP32 ───────────────────────────────────────────────────────────────

class _MockState:
    """Simulated ESP32 state for local development without hardware."""

    glass_present: bool = True
    state: str = "idle"
    last_pour_ml: int = 0
    nfc_uid: str = ""
    nfc_tag_present: bool = False
    nfc_ready: bool = True
    _start: float = time.time()

    def status(self) -> dict:
        return {
            "state": self.state,
            "glass_present": self.glass_present,
            "uptime": int(time.time() - self._start),
            "last_pour_ml": self.last_pour_ml,
            "nfc_uid": self.nfc_uid,
            "nfc_tag_present": self.nfc_tag_present,
            "nfc_ready": self.nfc_ready,
        }


_mock = _MockState()


# ─── Public API ───────────────────────────────────────────────────────────────


def fetch_status() -> dict:
    """Fetch the current status from the ESP32 hardware (or mock)."""
    if settings.mock_esp32:
        logger.debug("[mock] Returning simulated ESP32 status")
        return _mock.status()

    global _status_cache, _status_cache_at

    now = time.monotonic()
    if _status_cache is not None and now - _status_cache_at < _STATUS_TTL_S:
        return _status_cache

    with _status_lock:
        now = time.monotonic()
        if _status_cache is not None and now - _status_cache_at < _STATUS_TTL_S:
            return _status_cache

        try:
            resp = _session.get(
                f"{_esp32_url()}/status",
                timeout=settings.esp32_status_timeout,
            )
            data = resp.json()
        except (requests.RequestException, ValueError):
            _invalidate_url_cache()
            raise

        _status_cache = data
        _status_cache_at = now
        return data


def send_dispense(amount_ml: int) -> requests.Response:
    """Send a dispense command to the ESP32 (or mock)."""
    if settings.mock_esp32:
        logger.debug("[mock] Simulating dispense of %dml", amount_ml)
        _mock.last_pour_ml = amount_ml
        resp = MagicMock(spec=requests.Response)
        resp.status_code = 200
        return resp

    try:
        return _session.post(
            f"{_esp32_url()}/dispense",
            json={"amount_ml": amount_ml, "request_id": f"req_{int(time.time())}"},
            timeout=settings.esp32_dispense_timeout,
        )
    except requests.RequestException:
        _invalidate_url_cache()
        raise

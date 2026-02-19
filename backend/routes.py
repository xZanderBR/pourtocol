"""API routes for the Aztec Pour application."""

from __future__ import annotations

import http
import logging
import time

import requests
from flask import Blueprint, Response, jsonify, render_template, request

import esp32
from database import get_logs, log_event

logger = logging.getLogger(__name__)

MAX_DISPENSE_ML = 60

api = Blueprint("api", __name__)


class _DispenserState:
    """Mutable container for dispenser runtime state."""

    is_pouring: bool = False


_state = _DispenserState()


# --- Response helpers ---


def _error(reason: str, status_code: int = http.HTTPStatus.BAD_REQUEST) -> tuple[Response, int]:
    """Return a JSON error response with the given reason and status code."""
    return jsonify({"success": False, "reason": reason}), status_code


def _success(message: str) -> Response:
    """Return a JSON success response with the given message."""
    return jsonify({"success": True, "message": message})


# --- Dispense logic ---


def _execute_pour(user_token: str, amount_ml: int) -> tuple[Response, int] | Response:
    """Send the dispense command to the ESP32 and handle the response."""
    try:
        _state.is_pouring = True
        resp = esp32.send_dispense(amount_ml)
    except requests.RequestException as e:
        log_event(user_token, amount_ml, "failed", f"Connection error: {e!s}")
        return _error(f"Connection error: {e!s}", http.HTTPStatus.INTERNAL_SERVER_ERROR)
    finally:
        _state.is_pouring = False

    if resp.status_code == http.HTTPStatus.OK:
        log_event(user_token, amount_ml, "started")
        return _success("Dispense started")

    log_event(user_token, amount_ml, "failed", "ESP32 rejected request")
    return _error("ESP32 rejected request", http.HTTPStatus.INTERNAL_SERVER_ERROR)


@api.route("/")
def index() -> str:
    return render_template("index.html")


@api.route("/api/status")
def status() -> Response:
    try:
        esp_status = esp32.fetch_status()
        online = True
    except (requests.RequestException, ValueError):
        logger.debug("ESP32 unreachable", exc_info=True)
        esp_status = {
            "state": "offline",
            "glass_present": False,
            "uptime": 0,
            "last_pour_ml": 0,
        }
        online = False

    return jsonify({
        "server_online": True,
        "esp_online": online,
        "esp_status": esp_status,
        "timestamp": time.time(),
        "is_pouring": _state.is_pouring,
    })


@api.route("/api/dispense", methods=["POST"])
def dispense() -> tuple[Response, int] | Response:
    data = request.json or {}
    amount_ml = data.get("amount_ml", 0)
    user_token = data.get("user_token", "anonymous")

    if _state.is_pouring:
        log_event(user_token, amount_ml, "failed", "Already pouring")
        return _error("Already pouring")

    if amount_ml <= 0 or amount_ml > MAX_DISPENSE_ML:
        log_event(user_token, amount_ml, "failed", f"Invalid amount: {amount_ml}ml")
        return _error(f"Invalid amount (max {MAX_DISPENSE_ML}ml)")

    try:
        current_status = esp32.fetch_status()
    except requests.RequestException as e:
        log_event(user_token, amount_ml, "failed", f"Connection error: {e!s}")
        return _error(f"Connection error: {e!s}", http.HTTPStatus.INTERNAL_SERVER_ERROR)

    if not current_status.get("glass_present", False):
        log_event(user_token, amount_ml, "failed", "No glass present")
        return _error("No glass present")

    if current_status.get("state") != "idle":
        log_event(user_token, amount_ml, "failed", f"ESP32 not idle: {current_status.get('state')}")
        return _error("Device is busy")

    return _execute_pour(user_token, amount_ml)


@api.route("/api/logs")
def logs() -> Response:
    limit = request.args.get("limit", 20, type=int)
    event_logs = get_logs(limit)
    return jsonify([dict(log) for log in event_logs])

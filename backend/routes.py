"""API routes for the Pourtocol app."""

from __future__ import annotations

import http
import logging
import time
from pathlib import Path

import requests
from flask import Blueprint, Response, current_app, jsonify, request, send_from_directory

import esp32
import users
from config import settings
from database import get_leaderboard, get_logs, log_event

logger = logging.getLogger(__name__)

api = Blueprint("api", __name__)


# --- Response helpers ---


def _error(reason: str, status_code: int = http.HTTPStatus.BAD_REQUEST) -> tuple[Response, int]:
    """Return a JSON error response with the given reason and status code."""
    return jsonify({"success": False, "reason": reason}), status_code


def _success(message: str) -> Response:
    """Return a JSON success response with the given message."""
    return jsonify({"success": True, "message": message})


# --- Dispense logic ---


def _execute_pour(user_token: str, amount_ml: int) -> tuple[Response, int] | Response:
    """Send the dispense command to the ESP32 and surface its response."""
    try:
        resp = esp32.send_dispense(amount_ml)
    except requests.RequestException as e:
        log_event(user_token, amount_ml, "failed", f"Connection error: {e!s}")
        return _error(f"Connection error: {e!s}", http.HTTPStatus.INTERNAL_SERVER_ERROR)

    if resp.status_code == http.HTTPStatus.OK:
        log_event(user_token, amount_ml, "completed")
        return _success("Dispense started")

    try:
        reason = resp.json().get("error", "ESP32 rejected request")
    except ValueError:
        reason = "ESP32 rejected request"
    log_event(user_token, amount_ml, "failed", reason)
    return _error(reason, resp.status_code)


@api.route("/")
def index() -> Response:
    """Serve the built React frontend."""
    return send_from_directory(Path(current_app.static_folder), "index.html")  # type: ignore[arg-type]


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

    # Annotate with the friendly name for the currently-tapped UID (or null
    # if the tag is unmapped). Spread to avoid mutating esp32's cached dict.
    annotated = {**esp_status, "nfc_name": users.name_for(esp_status.get("nfc_uid", ""))}

    return jsonify({
        "server_online": True,
        "esp_online": online,
        "esp_status": annotated,
        "timestamp": time.time(),
    })


@api.route("/api/users", methods=["POST"])
def register_user() -> tuple[Response, int] | Response:
    data = request.json or {}
    uid = (data.get("uid") or "").strip()
    name = (data.get("name") or "").strip()
    if not uid or not name:
        return _error("uid and name are required")
    try:
        users.set_name(uid, name)
    except ValueError as e:
        return _error(str(e))
    except OSError:
        logger.exception("Failed to persist user mapping")
        return _error("Could not save mapping", http.HTTPStatus.INTERNAL_SERVER_ERROR)
    return _success(f"Saved {uid} → {name}")


@api.route("/api/dispense", methods=["POST"])
def dispense() -> tuple[Response, int] | Response:
    data = request.json or {}
    amount_ml = data.get("amount_ml", 0)
    user_token = users.resolve(data.get("user_token", "anonymous"))

    if amount_ml <= 0 or amount_ml > settings.max_dispense_ml:
        log_event(user_token, amount_ml, "failed", f"Invalid amount: {amount_ml}ml")
        return _error(f"Invalid amount (max {settings.max_dispense_ml}ml)")

    return _execute_pour(user_token, amount_ml)


@api.route("/api/logs")
def logs() -> Response:
    limit = request.args.get("limit", 20, type=int)
    event_logs = get_logs(limit)
    return jsonify([dict(log) for log in event_logs])


@api.route("/api/leaderboard")
def leaderboard() -> Response:
    limit = request.args.get("limit", 20, type=int)
    rows = get_leaderboard(limit)
    return jsonify([dict(row) for row in rows])

"""Resolve NFC UIDs (and other raw tokens) to friendly display names."""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

_USERS_FILE = Path(__file__).parent / "users.json"
_LOCK = threading.Lock()


def _load() -> dict[str, str]:
    try:
        with _USERS_FILE.open(encoding="utf-8") as f:
            return {str(k).upper(): str(v) for k, v in json.load(f).items()}
    except FileNotFoundError:
        return {}
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to load %s", _USERS_FILE)
        return {}


_USER_MAP: dict[str, str] = _load()


def resolve(token: str) -> str:
    """Return display name for token, or token itself if unmapped."""
    if not token:
        return token
    return _USER_MAP.get(token.upper(), token)


def name_for(uid: str) -> str | None:
    """Return the stored name for a UID, or None if unmapped."""
    if not uid:
        return None
    return _USER_MAP.get(uid.upper())


def set_name(uid: str, name: str) -> None:
    """Persist a UID → name mapping to users.json."""
    uid = uid.strip()
    name = name.strip()
    if not uid or not name:
        msg = "uid and name must both be non-empty"
        raise ValueError(msg)
    key = uid.upper()
    with _LOCK:
        _USER_MAP[key] = name
        tmp = _USERS_FILE.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(_USER_MAP, f, indent=2, sort_keys=True)
            f.write("\n")
        tmp.replace(_USERS_FILE)

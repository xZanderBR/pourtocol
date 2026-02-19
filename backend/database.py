from __future__ import annotations

import datetime
import logging
import sqlite3
from typing import TYPE_CHECKING

from flask import current_app, g

if TYPE_CHECKING:
    from flask import Flask

logger = logging.getLogger(__name__)


def get_db() -> sqlite3.Connection:
    """Get a database connection for the current request, reusing if available."""
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e: BaseException | None = None) -> None:  # noqa: ARG001
    """Close the database connection at the end of a request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    """Initialize the database schema."""
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_token TEXT,
            amount_ml INTEGER,
            status TEXT,
            reason TEXT
        )
    """)
    db.commit()
    logger.info("Database initialized.")


def init_app(app: Flask) -> None:
    """Register database lifecycle hooks with the Flask app."""
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()


def log_event(user_token: str, amount_ml: int, status: str, reason: str | None = None) -> None:
    db = get_db()
    db.execute(
        """
        INSERT INTO events (timestamp, user_token, amount_ml, status, reason)
        VALUES (?, ?, ?, ?, ?)
        """,
        (datetime.datetime.now(tz=datetime.UTC), user_token, amount_ml, status, reason),
    )
    db.commit()


def get_logs(limit: int = 20) -> list[sqlite3.Row]:
    db = get_db()
    return db.execute(
        "SELECT timestamp, user_token, amount_ml, status, reason "
        "FROM events ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    ).fetchall()

"""Aztec Pour - Flask application factory."""

from __future__ import annotations

from flask import Flask

from database import init_app
from routes import api


def create_app() -> Flask:
    """Application factory for the Aztec Pour Flask app."""
    app = Flask(__name__, template_folder=".")
    app.config["DATABASE"] = "dispenser.db"

    init_app(app)
    app.register_blueprint(api)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # noqa: S104

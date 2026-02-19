"""Chuggernog - Flask application factory."""

from __future__ import annotations

from flask import Flask

from config import settings
from database import init_app
from routes import api


def create_app() -> Flask:
    app = Flask(__name__, template_folder=".")
    app.config["DATABASE"] = settings.database_path

    init_app(app)
    app.register_blueprint(api)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=settings.host, port=settings.port, debug=settings.debug)

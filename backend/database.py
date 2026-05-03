from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    """Initialize tables. Call this inside app_context after db.init_app() has already run."""
    import models  # noqa: F401 — forces model classes to register with SQLAlchemy before create_all()
    db.create_all()
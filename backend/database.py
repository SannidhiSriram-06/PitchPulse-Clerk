from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    """Initialize tables. Call this inside app_context after db.init_app() has already run."""
    database_url = app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///pitchpulse.db')
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    import models  # noqa: F401 — forces model classes to register with SQLAlchemy before create_all()
    db.create_all()
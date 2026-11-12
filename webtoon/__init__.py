"""Webtoon backend integration for the existing Rebunar Flask app."""
from . import db, migrations

def register_webtoon(app, db_path_getter, auto_migrate=False):
    """Attach Webtoon to the existing app and existing Rebunar SQLite DB."""
    from .routes import bp
    db.configure(db_path_getter)
    if auto_migrate:
        migrations.up(db.db_path())
    if "webtoon" not in app.blueprints:
        app.register_blueprint(bp)

from flask import Blueprint, jsonify
from . import migrations
from .db import connect, db_path

bp = Blueprint("webtoon", __name__, url_prefix="/api/webtoon")

@bp.before_request
def require_schema():
    from flask import request
    if request.endpoint == "webtoon.ping":
        return None
    try:
        state = migrations.status(db_path())
    except (migrations.MigrationError, RuntimeError, OSError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503
    if state["pending"]:
        return jsonify({"ok": False, "error": "Webtoon database migrations are pending", **state}), 503
    return None

@bp.get("/ping")
def ping():
    try:
        state = migrations.status(db_path())
        return jsonify({"ok": not state["pending"], **state}), 200
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503

@bp.get("/genres")
def genres():
    with connect() as con:
        rows = con.execute("SELECT id, name FROM wt_genres ORDER BY name").fetchall()
    return jsonify({"genres": [dict(row) for row in rows]}), 200

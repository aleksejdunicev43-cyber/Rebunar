from flask import Blueprint, jsonify, request, session
from . import migrations
from .db import connect, db_path

bp = Blueprint("webtoon", __name__, url_prefix="/api/webtoon")

def _current_user_id():
    return session.get("user_id")

@bp.before_request
def require_schema_and_auth():
    from flask import request as flask_request
    if flask_request.endpoint == "webtoon.ping":
        return None
    try:
        state = migrations.status(db_path())
    except (migrations.MigrationError, RuntimeError, OSError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503
    if state["pending"]:
        return jsonify({"ok": False, "error": "Раздел Webtoon ещё не подготовлен на сервере", **state}), 503
    if not _current_user_id():
        return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401
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

@bp.get("/works")
def list_works():
    query = str(request.args.get("q", "")).strip()[:80]
    with connect() as con:
        con.row_factory = __import__("sqlite3").Row
        rows = con.execute("""
            SELECT w.id, w.owner_id, w.title, w.description, w.format, w.language,
                   w.serial_status, w.publication_status, w.cover_path, w.views,
                   w.created_at, u.username, u.display_name,
                   (SELECT COUNT(*) FROM wt_chapters c
                    WHERE c.work_id=w.id AND c.publication_status='published') AS chapter_count
            FROM wt_works w JOIN users u ON u.id=w.owner_id
            WHERE (w.publication_status='published' OR w.owner_id=?)
              AND (?='' OR w.title LIKE ? OR w.description LIKE ?)
            ORDER BY CASE WHEN w.publication_status='published' THEN 0 ELSE 1 END,
                     COALESCE(w.published_at,w.created_at) DESC
            LIMIT 100
        """, (_current_user_id(), query, f"%{query}%", f"%{query}%")).fetchall()
    return jsonify({"works": [dict(row) for row in rows]}), 200

@bp.post("/works")
def create_work():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()[:4000]
    work_format = str(data.get("format", "webtoon")).strip()
    language = str(data.get("language", "ru")).strip()[:12]
    serial_status = str(data.get("serial_status", "ongoing")).strip()
    genres = data.get("genres", [])
    if not 1 <= len(title) <= 120:
        return jsonify({"error": "Название должно содержать от 1 до 120 символов"}), 400
    if work_format not in ("webtoon", "manhwa", "manga", "manhua", "comic"):
        return jsonify({"error": "Неизвестный формат публикации"}), 400
    if serial_status not in ("ongoing", "completed", "hiatus"):
        return jsonify({"error": "Неизвестный статус серии"}), 400
    if not isinstance(genres, list) or len(genres) > 8:
        return jsonify({"error": "Выбери не более 8 жанров"}), 400
    try:
        genre_ids = list(dict.fromkeys(int(value) for value in genres))
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный список жанров"}), 400
    with connect() as con:
        if genre_ids:
            marks = ",".join("?" for _ in genre_ids)
            found = con.execute(f"SELECT COUNT(*) FROM wt_genres WHERE id IN ({marks})", genre_ids).fetchone()[0]
            if found != len(genre_ids):
                return jsonify({"error": "Один из выбранных жанров не найден"}), 400
        cur = con.execute("""
            INSERT INTO wt_works(owner_id,title,description,format,language,serial_status)
            VALUES(?,?,?,?,?,?)
        """, (_current_user_id(), title, description, work_format, language, serial_status))
        work_id = cur.lastrowid
        for genre_id in genre_ids:
            con.execute("INSERT INTO wt_work_genres(work_id,genre_id) VALUES(?,?)", (work_id, genre_id))
    return jsonify({"ok": True, "work_id": work_id}), 201

@bp.get("/works/<int:work_id>")
def get_work(work_id):
    with connect() as con:
        con.row_factory = __import__("sqlite3").Row
        work = con.execute("""
            SELECT w.*, u.username, u.display_name
            FROM wt_works w JOIN users u ON u.id=w.owner_id
            WHERE w.id=? AND (w.publication_status='published' OR w.owner_id=?)
        """, (work_id, _current_user_id())).fetchone()
        if not work:
            return jsonify({"error": "Работа не найдена"}), 404
        is_owner = int(work["owner_id"]) == int(_current_user_id())
        chapters = con.execute("""
            SELECT id, position, title, publication_status, created_at, published_at
            FROM wt_chapters WHERE work_id=?
              AND (publication_status='published' OR ?=1)
            ORDER BY position ASC
        """, (work_id, 1 if is_owner else 0)).fetchall()
        genres = con.execute("""
            SELECT g.id,g.name FROM wt_genres g
            JOIN wt_work_genres wg ON wg.genre_id=g.id
            WHERE wg.work_id=? ORDER BY g.name
        """, (work_id,)).fetchall()
    result = dict(work)
    result["is_owner"] = int(work["owner_id"]) == int(_current_user_id())
    result["chapters"] = [dict(row) for row in chapters]
    result["genres"] = [dict(row) for row in genres]
    return jsonify({"work": result}), 200

@bp.post("/works/<int:work_id>/chapters")
def create_chapter(work_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()[:120]
    try:
        position = int(data.get("position", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный номер главы"}), 400
    if position < 1 or position > 10000:
        return jsonify({"error": "Номер главы должен быть от 1 до 10000"}), 400
    with connect() as con:
        work = con.execute("SELECT owner_id FROM wt_works WHERE id=?", (work_id,)).fetchone()
        if not work:
            return jsonify({"error": "Работа не найдена"}), 404
        if work[0] != _current_user_id():
            return jsonify({"error": "Добавлять главы может только автор"}), 403
        if con.execute("SELECT 1 FROM wt_chapters WHERE work_id=? AND position=?", (work_id, position)).fetchone():
            return jsonify({"error": "Глава с таким номером уже существует"}), 409
        cur = con.execute("""
            INSERT INTO wt_chapters(work_id,position,title)
            VALUES(?,?,?)
        """, (work_id, position, title))
    return jsonify({"ok": True, "chapter_id": cur.lastrowid}), 201

@bp.post("/works/<int:work_id>/publish")
def publish_work(work_id):
    with connect() as con:
        work = con.execute("SELECT owner_id FROM wt_works WHERE id=?", (work_id,)).fetchone()
        if not work:
            return jsonify({"error": "Работа не найдена"}), 404
        if work[0] != _current_user_id():
            return jsonify({"error": "Публиковать работу может только автор"}), 403
        chapters = con.execute("SELECT COUNT(*) FROM wt_chapters WHERE work_id=?", (work_id,)).fetchone()[0]
        if chapters < 1:
            return jsonify({"error": "Добавь хотя бы одну главу перед публикацией"}), 400
        con.execute("""
            UPDATE wt_works SET publication_status='published',
                published_at=COALESCE(published_at,CURRENT_TIMESTAMP),
                updated_at=CURRENT_TIMESTAMP WHERE id=?
        """, (work_id,))
    return jsonify({"ok": True}), 200

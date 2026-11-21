import sqlite3
from flask import jsonify, session


def register_reader_studio_list_routes(
    app,
    connect,
    ensure_reader_tables,
    reader_user_required,
    reader_work_dict,
):
    @app.get("/api/reader/studio/works")
    def reader_studio_works():
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT w.*, COALESCE(u.display_name, u.username) AS author_name
                FROM reader_works w JOIN users u ON u.id = w.author_id
                WHERE w.author_id = ? ORDER BY w.updated_at DESC, w.id DESC
            """, (session["user_id"],)).fetchall()
        return jsonify([reader_work_dict(row) for row in rows])

    @app.get("/api/reader/studio/works/<int:work_id>/chapters")
    def reader_studio_chapters(work_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            work = con.execute(
                "SELECT id FROM reader_works WHERE id = ? AND author_id = ?",
                (work_id, session["user_id"])
            ).fetchone()
            if not work:
                return jsonify({"error": "Произведение не найдено"}), 404
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT id, chapter_number, title, status
                FROM reader_chapters
                WHERE work_id = ?
                ORDER BY chapter_number ASC
            """, (work_id,)).fetchall()
        return jsonify([dict(row) for row in rows])

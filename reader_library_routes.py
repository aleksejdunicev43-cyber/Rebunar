import sqlite3

from flask import jsonify, session


def register_reader_library_routes(
    app,
    connect,
    ensure_reader_tables,
    reader_user_required,
    reader_work_dict,
):
    @app.get("/api/reader/library")
    def reader_library_list():
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT w.*, COALESCE(u.display_name, u.username) AS author_name
                FROM reader_library l
                JOIN reader_works w ON w.id = l.work_id
                JOIN users u ON u.id = w.author_id
                WHERE l.user_id = ? AND w.status = 'published'
                ORDER BY l.created_at DESC, l.work_id DESC
            """, (session["user_id"],)).fetchall()
        return jsonify([reader_work_dict(row) for row in rows])

    @app.post("/api/reader/works/<int:work_id>/library")
    def reader_library_add(work_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            work = con.execute(
                "SELECT id FROM reader_works WHERE id = ? AND status = 'published'",
                (work_id,),
            ).fetchone()
            if not work:
                return jsonify({"error": "Опубликованное произведение не найдено"}), 404
            con.execute("""
                INSERT OR IGNORE INTO reader_library (user_id, work_id)
                VALUES (?, ?)
            """, (session["user_id"], work_id))
        return jsonify({"ok": True, "saved": True})

    @app.delete("/api/reader/works/<int:work_id>/library")
    def reader_library_remove(work_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            con.execute(
                "DELETE FROM reader_library WHERE user_id = ? AND work_id = ?",
                (session["user_id"], work_id),
            )
        return jsonify({"ok": True, "saved": False})

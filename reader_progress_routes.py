from flask import jsonify, request, session


def register_reader_progress_routes(app, connect, ensure_reader_tables):
    @app.get("/api/reader/works/<int:work_id>/progress")
    def reader_get_progress(work_id):
        ensure_reader_tables()
        if not session.get("user_id"):
            return jsonify({"error": "Войди в аккаунт, чтобы сохранять прогресс чтения"}), 401
        with connect() as con:
            rows = con.execute("""
                SELECT chapter_id, is_read, is_favorite
                FROM reader_progress WHERE user_id = ? AND work_id = ?
            """, (session["user_id"], work_id)).fetchall()
        return jsonify([
            {
                "chapter_id": row[0],
                "is_read": bool(row[1]),
                "is_favorite": bool(row[2])
            }
            for row in rows
        ])

    @app.post("/api/reader/chapters/<int:chapter_id>/progress")
    def reader_update_progress(chapter_id):
        ensure_reader_tables()
        if not session.get("user_id"):
            return jsonify({"error": "Войди в аккаунт, чтобы сохранять прогресс чтения"}), 401
        data = request.get_json(silent=True) or {}
        with connect() as con:
            chapter = con.execute("""
                SELECT c.work_id FROM reader_chapters c
                JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND c.status = 'published' AND w.status = 'published'
            """, (chapter_id,)).fetchone()
            if not chapter:
                return jsonify({"error": "Глава не найдена"}), 404
            current = con.execute("""
                SELECT is_read, is_favorite FROM reader_progress
                WHERE user_id = ? AND chapter_id = ?
            """, (session["user_id"], chapter_id)).fetchone()
            is_read = int(bool(data.get("is_read", current[0] if current else False)))
            is_favorite = int(bool(data.get("is_favorite", current[1] if current else False)))
            con.execute("""
                INSERT INTO reader_progress(user_id, work_id, chapter_id, is_read, is_favorite, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, chapter_id) DO UPDATE SET
                    is_read=excluded.is_read,
                    is_favorite=excluded.is_favorite,
                    updated_at=CURRENT_TIMESTAMP
            """, (session["user_id"], chapter[0], chapter_id, is_read, is_favorite))
        return jsonify({
            "chapter_id": chapter_id,
            "is_read": bool(is_read),
            "is_favorite": bool(is_favorite)
        })

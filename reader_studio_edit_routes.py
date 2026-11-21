import sqlite3

from flask import jsonify, request, session


def register_reader_studio_edit_routes(
    app,
    connect,
    ensure_reader_tables,
    reader_user_required,
):
    @app.get("/api/reader/studio/chapters/<int:chapter_id>")
    def reader_studio_chapter_detail(chapter_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            chapter = con.execute("""
                SELECT c.id, c.work_id, c.chapter_number, c.title, c.content,
                       c.status, w.category,
                       (SELECT COUNT(*) FROM reader_pages p WHERE p.chapter_id = c.id) AS page_count
                FROM reader_chapters c
                JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND w.author_id = ?
            """, (chapter_id, session["user_id"])).fetchone()
        if not chapter:
            return jsonify({"error": "Глава не найдена"}), 404
        return jsonify(dict(chapter))

    @app.put("/api/reader/works/<int:work_id>")
    def reader_studio_update_work(work_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        data = request.get_json(silent=True) or {}
        title = str(data.get("title", "")).strip()[:160]
        description = str(data.get("description", "")).strip()[:3000]
        if len(title) < 2:
            return jsonify({"error": "Название должно содержать минимум 2 символа"}), 400
        with connect() as con:
            cur = con.execute("""
                UPDATE reader_works
                SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND author_id = ?
            """, (title, description, work_id, session["user_id"]))
            if not cur.rowcount:
                return jsonify({"error": "Произведение не найдено"}), 404
        return jsonify({"ok": True, "id": work_id, "title": title, "description": description})

    @app.put("/api/reader/chapters/<int:chapter_id>")
    def reader_studio_update_chapter(chapter_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        data = request.get_json(silent=True) or {}
        title = str(data.get("title", "")).strip()[:160]
        content = str(data.get("content", "")).strip()
        if not title:
            return jsonify({"error": "Укажи название главы"}), 400
        if len(content) > 200000:
            return jsonify({"error": "Текст главы слишком большой (максимум 200 000 символов)"}), 413
        with connect() as con:
            con.row_factory = sqlite3.Row
            chapter = con.execute("""
                SELECT c.id, w.category
                FROM reader_chapters c
                JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND w.author_id = ?
            """, (chapter_id, session["user_id"])).fetchone()
            if not chapter:
                return jsonify({"error": "Глава не найдена"}), 404
            if chapter["category"] == "novel" and not content:
                return jsonify({"error": "Текст главы не может быть пустым"}), 400
            if chapter["category"] == "webtoon":
                # Webtoon pages are stored separately; editing the title must not erase them.
                con.execute("""
                    UPDATE reader_chapters SET title = ?
                    WHERE id = ?
                """, (title, chapter_id))
            else:
                con.execute("""
                    UPDATE reader_chapters SET title = ?, content = ?
                    WHERE id = ?
                """, (title, content, chapter_id))
        return jsonify({"ok": True, "id": chapter_id})

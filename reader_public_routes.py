import sqlite3

from flask import jsonify, request


def register_reader_public_routes(app, connect, ensure_reader_tables, reader_work_dict):
    @app.get("/api/reader/works")
    def reader_public_works():
        ensure_reader_tables()
        category = request.args.get("category", "").strip()
        if category and category not in ("novel", "webtoon"):
            return jsonify({"error": "Неизвестная категория"}), 400
        sql = """
            SELECT w.*, COALESCE(u.display_name, u.username) AS author_name
            FROM reader_works w JOIN users u ON u.id = w.author_id
            WHERE w.status = 'published'
        """
        params = []
        if category:
            sql += " AND w.category = ?"
            params.append(category)
        sql += " ORDER BY COALESCE(w.published_at, w.created_at) DESC LIMIT 100"
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute(sql, params).fetchall()
        return jsonify([reader_work_dict(row) for row in rows])
    
    @app.get("/api/reader/works/<int:work_id>")
    def reader_public_work(work_id):
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            row = con.execute("""
                SELECT w.*, COALESCE(u.display_name, u.username) AS author_name
                FROM reader_works w JOIN users u ON u.id = w.author_id
                WHERE w.id = ? AND w.status = 'published'
            """, (work_id,)).fetchone()
        if not row:
            return jsonify({"error": "Произведение не найдено"}), 404
        return jsonify(reader_work_dict(row))
    
    @app.get("/api/reader/works/<int:work_id>/chapters")
    def reader_public_chapters(work_id):
        ensure_reader_tables()
        with connect() as con:
            work = con.execute("SELECT id FROM reader_works WHERE id = ? AND status = 'published'", (work_id,)).fetchone()
            if not work:
                return jsonify({"error": "Произведение не найдено"}), 404
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT id, chapter_number, title, published_at
                FROM reader_chapters
                WHERE work_id = ? AND status = 'published'
                ORDER BY chapter_number ASC
            """, (work_id,)).fetchall()
        return jsonify([dict(row) for row in rows])
    
    
    @app.get("/api/reader/chapters/<int:chapter_id>")
    def reader_public_chapter(chapter_id):
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            chapter = con.execute("""
                SELECT c.*, w.category, w.title AS work_title, w.id AS work_id
                FROM reader_chapters c JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND c.status = 'published' AND w.status = 'published'
            """, (chapter_id,)).fetchone()
            if not chapter:
                return jsonify({"error": "Глава не найдена"}), 404
            pages = con.execute(
                "SELECT image_path FROM reader_pages WHERE chapter_id = ? ORDER BY page_number",
                (chapter_id,)
            ).fetchall()
        return jsonify({
            "id": chapter["id"], "work_id": chapter["work_id"],
            "work_title": chapter["work_title"], "category": chapter["category"],
            "chapter_number": chapter["chapter_number"], "title": chapter["title"],
            "content": chapter["content"],
            "pages": ["/reader-media/" + row["image_path"] for row in pages]
        })

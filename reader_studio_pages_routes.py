import sqlite3
import uuid
from io import BytesIO
from pathlib import Path

from flask import jsonify, request, session
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_PAGE_IMAGE = 8 * 1024 * 1024


def register_reader_studio_pages_routes(
    app,
    connect,
    ensure_reader_tables,
    reader_user_required,
    storage,
    remove_reader_media,
):
    storage = Path(storage)

    def owned_page(con, page_id):
        con.row_factory = sqlite3.Row
        return con.execute("""
            SELECT p.id, p.chapter_id, p.page_number, p.image_path,
                   c.work_id, w.category, w.author_id
            FROM reader_pages p
            JOIN reader_chapters c ON c.id = p.chapter_id
            JOIN reader_works w ON w.id = c.work_id
            WHERE p.id = ? AND w.author_id = ?
        """, (page_id, session["user_id"])).fetchone()

    @app.get("/api/reader/studio/chapters/<int:chapter_id>/pages")
    def reader_studio_list_pages(chapter_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            con.row_factory = sqlite3.Row
            chapter = con.execute("""
                SELECT c.id
                FROM reader_chapters c
                JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND w.author_id = ? AND w.category = 'webtoon'
            """, (chapter_id, session["user_id"])).fetchone()
            if not chapter:
                return jsonify({"error": "Глава вебтуна не найдена"}), 404
            pages = con.execute("""
                SELECT id, page_number, image_path
                FROM reader_pages
                WHERE chapter_id = ?
                ORDER BY page_number ASC
            """, (chapter_id,)).fetchall()
        return jsonify([
            {
                "id": page["id"],
                "page_number": page["page_number"],
                "image_url": "/reader-media/" + page["image_path"],
            }
            for page in pages
        ])

    @app.post("/api/reader/pages/<int:page_id>/replace")
    def reader_studio_replace_page(page_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Выбери новое изображение страницы"}), 400
        raw = file.read(MAX_PAGE_IMAGE + 1)
        if len(raw) > MAX_PAGE_IMAGE:
            return jsonify({"error": "Одна страница должна быть не больше 8 МБ"}), 413
        try:
            image = Image.open(BytesIO(raw))
            image = ImageOps.exif_transpose(image)
            image.load()
            if image.width * image.height > 40000000:
                return jsonify({"error": "Слишком большое разрешение изображения"}), 400
            image.thumbnail((2400, 12000))
            image = image.convert("RGB")
            folder = storage / "webtoons"
            folder.mkdir(parents=True, exist_ok=True)
            filename = uuid.uuid4().hex + ".webp"
            image.save(folder / filename, "WEBP", quality=88, method=6)
        except (UnidentifiedImageError, OSError, ValueError):
            return jsonify({"error": "Файл не является корректным изображением"}), 400

        relative = "webtoons/" + filename
        old_path = None
        try:
            with connect() as con:
                page = owned_page(con, page_id)
                if not page or page["category"] != "webtoon":
                    (folder / filename).unlink(missing_ok=True)
                    return jsonify({"error": "Страница вебтуна не найдена"}), 404
                old_path = page["image_path"]
                con.execute(
                    "UPDATE reader_pages SET image_path = ? WHERE id = ?",
                    (relative, page_id),
                )
        except Exception:
            (folder / filename).unlink(missing_ok=True)
            raise
        if old_path:
            remove_reader_media([old_path], storage)
        return jsonify({
            "ok": True,
            "id": page_id,
            "image_url": "/reader-media/" + relative,
        })

    @app.post("/api/reader/chapters/<int:chapter_id>/pages/add")
    def reader_studio_add_page(chapter_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        file = request.files.get("image")
        if not file:
            return jsonify({"error": "Выбери изображение страницы"}), 400
        raw = file.read(MAX_PAGE_IMAGE + 1)
        if len(raw) > MAX_PAGE_IMAGE:
            return jsonify({"error": "Одна страница должна быть не больше 8 МБ"}), 413
        try:
            image = Image.open(BytesIO(raw))
            image = ImageOps.exif_transpose(image)
            image.load()
            if image.width * image.height > 40000000:
                return jsonify({"error": "Слишком большое разрешение изображения"}), 400
            image.thumbnail((2400, 12000))
            image = image.convert("RGB")
            folder = storage / "webtoons"
            folder.mkdir(parents=True, exist_ok=True)
            filename = uuid.uuid4().hex + ".webp"
            image.save(folder / filename, "WEBP", quality=88, method=6)
        except (UnidentifiedImageError, OSError, ValueError):
            return jsonify({"error": "Файл не является корректным изображением"}), 400

        relative = "webtoons/" + filename
        try:
            with connect() as con:
                chapter = con.execute("""
                    SELECT c.id
                    FROM reader_chapters c
                    JOIN reader_works w ON w.id = c.work_id
                    WHERE c.id = ? AND w.author_id = ? AND w.category = 'webtoon'
                """, (chapter_id, session["user_id"])).fetchone()
                if not chapter:
                    (folder / filename).unlink(missing_ok=True)
                    return jsonify({"error": "Глава вебтуна не найдена"}), 404
                number = con.execute(
                    "SELECT COALESCE(MAX(page_number), 0) + 1 FROM reader_pages WHERE chapter_id = ?",
                    (chapter_id,),
                ).fetchone()[0]
                con.execute(
                    "INSERT INTO reader_pages (chapter_id, page_number, image_path) VALUES (?, ?, ?)",
                    (chapter_id, number, relative),
                )
        except Exception:
            (folder / filename).unlink(missing_ok=True)
            raise
        return jsonify({
            "ok": True,
            "page_number": number,
            "image_url": "/reader-media/" + relative,
        }), 201

    @app.delete("/api/reader/pages/<int:page_id>")
    def reader_studio_delete_page(page_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        with connect() as con:
            page = owned_page(con, page_id)
            if not page or page["category"] != "webtoon":
                return jsonify({"error": "Страница вебтуна не найдена"}), 404
            count = con.execute(
                "SELECT COUNT(*) FROM reader_pages WHERE chapter_id = ?",
                (page["chapter_id"],),
            ).fetchone()[0]
            if count <= 1:
                return jsonify({"error": "В главе должна остаться хотя бы одна страница"}), 400
            con.execute("DELETE FROM reader_pages WHERE id = ?", (page_id,))
            # Two-phase renumbering avoids collisions with UNIQUE(chapter_id, page_number).
            con.execute(
                "UPDATE reader_pages SET page_number = -page_number WHERE chapter_id = ?",
                (page["chapter_id"],),
            )
            remaining = con.execute(
                "SELECT id FROM reader_pages WHERE chapter_id = ? ORDER BY page_number DESC",
                (page["chapter_id"],),
            ).fetchall()
            for number, row in enumerate(remaining, 1):
                con.execute(
                    "UPDATE reader_pages SET page_number = ? WHERE id = ?",
                    (number, row[0]),
                )
        remove_reader_media([page["image_path"]], storage)
        return jsonify({"ok": True})

    @app.put("/api/reader/chapters/<int:chapter_id>/pages/order")
    def reader_studio_reorder_pages(chapter_id):
        auth = reader_user_required()
        if auth:
            return auth
        ensure_reader_tables()
        data = request.get_json(silent=True) or {}
        page_ids = data.get("page_ids")
        if not isinstance(page_ids, list) or any(
            isinstance(value, bool) or not isinstance(value, int) for value in page_ids
        ):
            return jsonify({"error": "Передан некорректный порядок страниц"}), 400
        if len(page_ids) != len(set(page_ids)):
            return jsonify({"error": "Страница не может повторяться в списке"}), 400
        with connect() as con:
            chapter = con.execute("""
                SELECT c.id
                FROM reader_chapters c
                JOIN reader_works w ON w.id = c.work_id
                WHERE c.id = ? AND w.author_id = ? AND w.category = 'webtoon'
            """, (chapter_id, session["user_id"])).fetchone()
            if not chapter:
                return jsonify({"error": "Глава вебтуна не найдена"}), 404
            existing = [
                row[0] for row in con.execute(
                    "SELECT id FROM reader_pages WHERE chapter_id = ? ORDER BY page_number",
                    (chapter_id,),
                ).fetchall()
            ]
            if len(existing) != len(page_ids) or set(existing) != set(page_ids):
                return jsonify({"error": "Список страниц изменился. Обнови редактор и попробуй снова."}), 409
            con.execute(
                "UPDATE reader_pages SET page_number = -page_number WHERE chapter_id = ?",
                (chapter_id,),
            )
            for number, page_id in enumerate(page_ids, 1):
                con.execute(
                    "UPDATE reader_pages SET page_number = ? WHERE id = ? AND chapter_id = ?",
                    (number, page_id, chapter_id),
                )
        return jsonify({"ok": True, "page_ids": page_ids})

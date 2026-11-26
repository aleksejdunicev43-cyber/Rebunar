from flask import jsonify, request, send_from_directory, session
from pathlib import Path
import json
import uuid


def register_home_settings_routes(app, connect, base):
    """Account-scoped settings for the Rebunar home workspace."""
    storage = Path(base) / "uploads" / "home_wallpapers"

    with connect() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS home_workspace_settings (
                user_id INTEGER PRIMARY KEY,
                wallpaper_path TEXT,
                layout_json TEXT,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

    @app.get("/api/home/settings")
    def get_home_settings():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"logged_in": False, "wallpaper_url": None, "layout": None}), 200
        with connect() as con:
            row = con.execute(
                "SELECT wallpaper_path, layout_json FROM home_workspace_settings WHERE user_id = ?",
                (user_id,)
            ).fetchone()
        wallpaper_path = row[0] if row else None
        layout_json = row[1] if row else None
        layout = None
        if layout_json:
            try:
                layout = json.loads(layout_json)
            except (TypeError, ValueError):
                layout = None
        return jsonify({
            "logged_in": True,
            "wallpaper_url": ("/uploads/home-wallpapers/" + Path(wallpaper_path).name) if wallpaper_path else None,
            "layout": layout
        }), 200

    @app.post("/api/home/wallpaper")
    def upload_home_wallpaper():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
        file = request.files.get("wallpaper")
        if not file:
            return jsonify({"error": "Изображение не выбрано"}), 400
        data = file.read(12 * 1024 * 1024 + 1)
        if len(data) > 12 * 1024 * 1024:
            return jsonify({"error": "Размер обоев не должен превышать 12 МБ"}), 413
        if data.startswith(b"\xff\xd8\xff"):
            extension = ".jpg"
        elif data.startswith(b"\x89PNG\r\n\x1a\n"):
            extension = ".png"
        elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            extension = ".webp"
        else:
            return jsonify({"error": "Ожидается изображение JPEG, PNG или WebP"}), 400

        storage.mkdir(parents=True, exist_ok=True)
        filename = uuid.uuid4().hex + extension
        destination = storage / filename
        destination.write_bytes(data)
        relative_path = filename
        with connect() as con:
            previous = con.execute(
                "SELECT wallpaper_path FROM home_workspace_settings WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            con.execute("""
                INSERT INTO home_workspace_settings (user_id, wallpaper_path, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    wallpaper_path = excluded.wallpaper_path,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, relative_path))
        if previous and previous[0]:
            old_name = Path(previous[0]).name
            if old_name != filename:
                try:
                    (storage / old_name).unlink(missing_ok=True)
                except OSError:
                    pass
        return jsonify({"ok": True, "wallpaper_url": "/uploads/home-wallpapers/" + filename}), 200

    @app.get("/uploads/home-wallpapers/<filename>")
    def get_home_wallpaper(filename):
        if Path(filename).name != filename:
            return jsonify({"error": "Обои не найдены"}), 404
        return send_from_directory(storage, filename)

    @app.delete("/api/home/wallpaper")
    def delete_home_wallpaper():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
        with connect() as con:
            row = con.execute(
                "SELECT wallpaper_path FROM home_workspace_settings WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            con.execute("""
                INSERT INTO home_workspace_settings (user_id, wallpaper_path, updated_at)
                VALUES (?, NULL, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    wallpaper_path = NULL,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id,))
        if row and row[0]:
            try:
                (storage / Path(row[0]).name).unlink(missing_ok=True)
            except OSError:
                pass
        return jsonify({"ok": True}), 200

    @app.put("/api/home/layout")
    def save_home_layout():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
        data = request.get_json(silent=True) or {}
        layout = data.get("layout")
        if not isinstance(layout, dict):
            return jsonify({"error": "Некорректная раскладка рабочего стола"}), 400
        encoded = json.dumps(layout, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > 65536:
            return jsonify({"error": "Настройки рабочего стола слишком велики"}), 413
        with connect() as con:
            con.execute("""
                INSERT INTO home_workspace_settings (user_id, layout_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    layout_json = excluded.layout_json,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, encoded))
        return jsonify({"ok": True}), 200

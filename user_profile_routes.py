from flask import request, jsonify, send_from_directory, session
import sqlite3
import uuid
from pathlib import Path


def register_user_profile_routes(app, connect, base):
    @app.get("/api/users/search")
    def search_users():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
    
        q = str(request.args.get("q", "")).strip()[:50]
        if not q:
            return jsonify([]), 200
    
        with connect() as con:
            con.row_factory = sqlite3.Row
            rows = con.execute("""
                SELECT u.id, u.username, u.display_name, u.avatar
                FROM users u
                WHERE u.id != ?
                  AND (u.username LIKE ? OR u.display_name LIKE ?)
                ORDER BY u.username
                LIMIT 30
            """, (
                session["user_id"],
                "%" + q + "%",
                "%" + q + "%"
            )).fetchall()
    
        return jsonify([
            {
                "id": row["id"],
                "username": row["username"],
                "display_name": row["display_name"] or row["username"],
                "avatar": row["avatar"] or ""
            }
            for row in rows
        ]), 200
    
    
    
    @app.get("/api/users")
    def list_users():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
    
        query = str(request.args.get("q", "")).strip().lstrip("@")[:50]
        try:
            page = max(1, int(request.args.get("page", 1)))
            limit = min(50, max(1, int(request.args.get("limit", 20))))
        except (TypeError, ValueError):
            return jsonify({"error": "Некорректные параметры списка"}), 400
    
        pattern = "%" + query + "%"
        where = ""
        params = []
        if query:
            where = "WHERE u.username LIKE ? OR COALESCE(u.display_name, '') LIKE ?"
            params.extend((pattern, pattern))
    
        offset = (page - 1) * limit
        with connect() as con:
            con.row_factory = sqlite3.Row
            total_registered = con.execute(
                "SELECT COUNT(*) FROM users"
            ).fetchone()[0]
            total_results = con.execute(
                "SELECT COUNT(*) FROM users u " + where,
                params
            ).fetchone()[0]
            pages = max(1, (total_results + limit - 1) // limit)
    
            rows = con.execute("""
                SELECT
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar,
                    EXISTS(
                        SELECT 1 FROM user_presence p
                        WHERE p.user_id = u.id
                          AND p.last_seen >= datetime('now', '-5 minutes')
                    ) AS online
                FROM users u
                """ + where + """
                ORDER BY u.id DESC
                LIMIT ? OFFSET ?
            """, params + [limit, offset]).fetchall()
    
        return jsonify({
            "total_registered": total_registered,
            "total_results": total_results,
            "page": page,
            "pages": pages,
            "users": [
                {
                    "id": row["id"],
                    "username": row["username"],
                    "display_name": row["display_name"] or row["username"],
                    "avatar": row["avatar"] or "",
                    "online": bool(row["online"]),
                    "is_me": row["id"] == session["user_id"]
                }
                for row in rows
            ]
        }), 200
    
    
    @app.get("/api/users/<int:profile_user_id>/profile")
    def get_public_user_profile(profile_user_id):
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
    
        with connect() as con:
            con.row_factory = sqlite3.Row
            row = con.execute("""
                SELECT
                    u.id, u.username, u.display_name, u.avatar, u.bio,
                    EXISTS(
                        SELECT 1 FROM user_presence p
                        WHERE p.user_id = u.id
                          AND p.last_seen >= datetime('now', '-5 minutes')
                    ) AS online
                FROM users u
                WHERE u.id = ?
            """, (profile_user_id,)).fetchone()
    
        if not row:
            return jsonify({"error": "Пользователь не найден"}), 404
    
        return jsonify({
            "id": row["id"],
            "username": row["username"],
            "display_name": row["display_name"] or row["username"],
            "avatar": row["avatar"] or "",
            "bio": row["bio"] or "",
            "online": bool(row["online"]),
            "is_me": row["id"] == session["user_id"]
        }), 200
    
    
    @app.post("/api/profile")
    def update_profile():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
    
        data = request.get_json(silent=True) or {}
        display_name = str(data.get("display_name", "")).strip()[:100]
        username = str(data.get("username", "")).strip()[:50]
        bio = str(data.get("bio", "")).strip()[:500]
    
        if username.startswith("@"):
            username = username[1:].strip()
    
        if len(username) < 3:
            return jsonify({"error": "Имя пользователя должно содержать минимум 3 символа"}), 400
    
        if not username.replace("_", "").isalnum():
            return jsonify({
                "error": "Имя пользователя может содержать только буквы, цифры и символ _"
            }), 400
    
        try:
            with connect() as con:
                con.execute(
                    "UPDATE users SET username = ?, display_name = ?, bio = ? WHERE id = ?",
                    (username, display_name, bio, session["user_id"])
                )
        except sqlite3.IntegrityError:
            return jsonify({"error": "Такое имя пользователя уже занято"}), 409
    
        return jsonify({
            "ok": True,
            "username": username,
            "display_name": display_name,
            "bio": bio
        }), 200
    
    
    @app.post("/api/profile/avatar")
    def upload_profile_avatar():
        if "user_id" not in session:
            return jsonify({"error": "Необходимо войти в аккаунт"}), 401
    
        file = request.files.get("avatar")
        if not file:
            return jsonify({"error": "Фотография не выбрана"}), 400
    
        data = file.read(2 * 1024 * 1024 + 1)
        if len(data) > 2 * 1024 * 1024:
            return jsonify({"error": "Размер аватара не должен превышать 2 МБ"}), 413
    
        if not data.startswith(b"\xff\xd8\xff"):
            return jsonify({"error": "Ожидается готовое изображение JPEG"}), 400
    
        folder = BASE / "uploads" / "avatars"
        folder.mkdir(parents=True, exist_ok=True)
    
        filename = uuid.uuid4().hex + ".jpg"
        (folder / filename).write_bytes(data)
        avatar_url = "/uploads/avatars/" + filename
    
        with connect() as con:
            con.execute(
                "UPDATE users SET avatar = ? WHERE id = ?",
                (avatar_url, session["user_id"])
            )
    
        return jsonify({"ok": True, "avatar": avatar_url}), 200
    
    
    @app.get("/uploads/avatars/<filename>")
    def get_profile_avatar(filename):
        if Path(filename).name != filename:
            return jsonify({"error": "Фотография не найдена"}), 404
    
        return send_from_directory(BASE / "uploads" / "avatars", filename)

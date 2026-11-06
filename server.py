from flask import Flask, request, jsonify, send_from_directory, session
import sqlite3
import hashlib
import uuid
import json
import math
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
from io import BytesIO
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
KEY_FILE = Path(__file__).resolve().parent / ".secret_key"
if not KEY_FILE.exists():
    import secrets
    KEY_FILE.write_text(secrets.token_hex(32))
app.secret_key = KEY_FILE.read_text().strip()
BASE = Path(__file__).resolve().parent
DB = BASE / "rebunar.db"

def connect():
    return sqlite3.connect(DB)


@app.after_request
def disable_api_caching(response):
    # Authentication state must always be fetched from the server.
    # In particular, a stale cached /api/me response must never restore
    # a previously authenticated UI after logout.
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


def get_messages_time_column(con):
    columns = {row[1] for row in con.execute("PRAGMA table_info(messages)")}
    if "created_at" in columns:
        return "created_at"
    if "timestamp" in columns:
        return "timestamp"
    raise RuntimeError("В таблице messages нет столбца времени")

def init_db():
    with connect() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)


        con.execute("""
            CREATE TABLE IF NOT EXISTS profile_progress (
                user_id INTEGER PRIMARY KEY,
                xp INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS communities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT ''
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS memberships (
                user_id INTEGER NOT NULL,
                community_id INTEGER NOT NULL,
                UNIQUE(user_id, community_id)
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS hidden_chats (
                user_id INTEGER NOT NULL,
                other_user_id INTEGER NOT NULL,
                UNIQUE(user_id, other_user_id)
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS matrix_accounts (
                user_id INTEGER PRIMARY KEY,
                matrix_user_id TEXT NOT NULL UNIQUE,
                device_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS registration_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                registered_at TEXT NOT NULL
            )
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS account_count_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                delta INTEGER NOT NULL,
                recorded_at TEXT NOT NULL,
                event_type TEXT NOT NULL
            )
        """)

        con.execute("""
            INSERT INTO account_count_events (delta, recorded_at, event_type)
            SELECT COUNT(*), CURRENT_TIMESTAMP, 'baseline'
            FROM users
            WHERE NOT EXISTS (SELECT 1 FROM account_count_events)
        """)

        con.execute("""
            CREATE TRIGGER IF NOT EXISTS users_count_after_insert
            AFTER INSERT ON users
            BEGIN
                INSERT INTO account_count_events (delta, recorded_at, event_type)
                VALUES (1, CURRENT_TIMESTAMP, 'registration');
            END
        """)

        con.execute("""
            CREATE TRIGGER IF NOT EXISTS users_count_after_delete
            AFTER DELETE ON users
            BEGIN
                INSERT INTO account_count_events (delta, recorded_at, event_type)
                VALUES (-1, CURRENT_TIMESTAMP, 'deletion');
            END
        """)

        con.execute("""
            CREATE TABLE IF NOT EXISTS user_presence (
                presence_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        con.execute("""
            CREATE INDEX IF NOT EXISTS idx_presence_last_seen
            ON user_presence(last_seen)
        """)

        con.execute("""
            INSERT INTO registration_events (user_id, registered_at)
            SELECT u.id, COALESCE(u.created_at, CURRENT_TIMESTAMP)
            FROM users AS u
            WHERE NOT EXISTS (
                SELECT 1
                FROM registration_events AS e
                WHERE e.user_id = u.id
            )
        """)

        message_columns = [row[1] for row in con.execute("PRAGMA table_info(messages)")]
        if "image_path" not in message_columns:
            con.execute("ALTER TABLE messages ADD COLUMN image_path TEXT")

        post_columns = [row[1] for row in con.execute("PRAGMA table_info(posts)")]
        if "community_id" not in post_columns:
            con.execute("ALTER TABLE posts ADD COLUMN community_id INTEGER")

        communities = [
            ("indie-games", "Инди-игры", "Независимые игры и новые проекты"),
            ("anime", "Аниме", "Обсуждаем аниме и мангу"),
            ("looking-for-team", "Ищу команду", "Поиск разработчиков и участников команды"),
            ("game-talk", "Обсуждение игр", "Новости, впечатления и игровые дискуссии"),
        ]

        con.executemany(
            "INSERT OR IGNORE INTO communities (slug, name, description) VALUES (?, ?, ?)",
            communities
        )

        columns = [row[1] for row in con.execute("PRAGMA table_info(posts)")]
        if "user_id" not in columns:
            con.execute("ALTER TABLE posts ADD COLUMN user_id INTEGER")

@app.get("/")
def home():
    return send_from_directory(BASE, "index.html")

@app.get("/new")
def new_frontend():
    build_dir = BASE / "frontend" / "build"
    if (build_dir / "index.html").is_file():
        return send_from_directory(build_dir, "index.html")
    return send_from_directory(BASE / "frontend", "index.html")

@app.get("/new/<path:filename>")
def new_frontend_file(filename):
    build_dir = BASE / "frontend" / "build"
    if (build_dir / filename).is_file():
        return send_from_directory(build_dir, filename)
    return send_from_directory(BASE / "frontend", filename)

@app.get("/api/statistics/summary")
def statistics_summary():
    with connect() as con:
        total = con.execute(
            "SELECT COUNT(*) FROM users"
        ).fetchone()[0]

        online = con.execute("""
            SELECT COUNT(DISTINCT user_id)
            FROM user_presence
            WHERE last_seen >= datetime('now', '-2 minutes')
        """).fetchone()[0]

    return jsonify({
        "total_users": total,
        "online_users": online
    })


@app.get("/api/statistics/history")
def statistics_history():
    with connect() as con:
        rows = con.execute("""
            WITH daily AS (
                SELECT date(recorded_at) AS day, SUM(delta) AS delta
                FROM account_count_events
                GROUP BY date(recorded_at)
            )
            SELECT
                day,
                delta,
                SUM(delta) OVER (
                    ORDER BY day
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS total
            FROM daily
            ORDER BY day ASC
        """).fetchall()
        current_total = con.execute(
            "SELECT COUNT(*) FROM users"
        ).fetchone()[0]

    return jsonify({
        "current_total": current_total,
        "points": [
            {"date": row[0], "delta": row[1], "total": row[2]}
            for row in rows
        ]
    })


@app.post("/api/presence/heartbeat")
def presence_heartbeat():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Требуется авторизация"}), 401

    presence_id = session.get("presence_id")
    if not presence_id:
        presence_id = str(uuid.uuid4())
        session["presence_id"] = presence_id

    with connect() as con:
        con.execute("""
            INSERT INTO user_presence (presence_id, user_id, last_seen)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(presence_id) DO UPDATE SET
                user_id = excluded.user_id,
                last_seen = CURRENT_TIMESTAMP
        """, (presence_id, user_id))

        con.execute("""
            DELETE FROM user_presence
            WHERE last_seen < datetime('now', '-1 day')
        """)

    return jsonify({"ok": True}), 200


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Rebunar API"})

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()[:50]
    password = str(data.get("password", ""))

    if len(username) < 3 or len(password) < 4:
        return jsonify({"error": "Логин минимум 3 символа, пароль минимум 4"}), 400

    password_hash = generate_password_hash(password)

    try:
        with connect() as con:
            cur = con.execute(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                (username, password_hash)
            )
            user_id = cur.lastrowid

            con.execute(
                """
                INSERT INTO registration_events (user_id, registered_at)
                VALUES (?, CURRENT_TIMESTAMP)
                """,
                (user_id,)
            )

        return jsonify({
            "id": user_id,
            "username": username
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Такой пользователь уже существует"}), 409


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()[:50]
    password = str(data.get("password", ""))
    password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()

    with connect() as con:
        con.row_factory = sqlite3.Row
        user = con.execute(
            """
            SELECT u.id, u.username, u.password, u.display_name, u.bio, u.avatar
            FROM users u
            WHERE u.username = ?
            """,
            (username,)
        ).fetchone()

        ok = False
        if user:
            stored = user["password"]
            if stored.startswith(("pbkdf2:", "scrypt:")):
                ok = check_password_hash(stored, password)
            elif stored == hashlib.sha256(password.encode("utf-8")).hexdigest():
                ok = True
                con.execute(
                    "UPDATE users SET password = ? WHERE id = ?",
                    (generate_password_hash(password), user["id"])
                )

    if not ok:
        return jsonify({"error": "Неверный логин или пароль"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or "",
        "bio": user["bio"] or "",
        "avatar": user["avatar"] or ""
    }), 200


@app.post("/api/security/password")
def change_password():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    data = request.get_json(silent=True) or {}
    current_password = str(data.get("current_password", ""))
    new_password = str(data.get("new_password", ""))

    if len(new_password) < 4:
        return jsonify({
            "error": "Новый пароль должен содержать минимум 4 символа"
        }), 400

    with connect() as con:
        con.row_factory = sqlite3.Row
        user = con.execute(
            "SELECT id, password FROM users WHERE id = ?",
            (session["user_id"],)
        ).fetchone()

        if not user:
            session.clear()
            return jsonify({"error": "Пользователь не найден"}), 401

        stored = user["password"]

        if stored.startswith(("pbkdf2:", "scrypt:")):
            valid = check_password_hash(stored, current_password)
        else:
            valid = (
                stored ==
                hashlib.sha256(current_password.encode("utf-8")).hexdigest()
            )

        if not valid:
            return jsonify({"error": "Текущий пароль указан неверно"}), 401

        new_password_hash = generate_password_hash(new_password)

        con.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            (new_password_hash, user["id"])
        )

    return jsonify({"ok": True}), 200


@app.get("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False}), 200

    with connect() as con:
        con.row_factory = sqlite3.Row
        user = con.execute(
            """SELECT u.id, u.username, u.display_name, u.bio, u.avatar
               FROM users u
               WHERE u.id = ?""",
            (session["user_id"],)
        ).fetchone()

    if not user:
        session.clear()
        return jsonify({"logged_in": False}), 200

    return jsonify({
        "logged_in": True,
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or "",
        "bio": user["bio"] or "",
        "avatar": user["avatar"] or ""
    }), 200



@app.get("/api/matrix/status")
def matrix_account_status():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401

    with connect() as con:
        row = con.execute(
            "SELECT matrix_user_id, device_id FROM matrix_accounts WHERE user_id = ?",
            (session["user_id"],)
        ).fetchone()

    if not row:
        return jsonify({
            "linked": False,
            "matrix_user_id": None,
            "device_id": None
        }), 200

    return jsonify({
        "linked": True,
        "matrix_user_id": row[0],
        "device_id": row[1]
    }), 200


@app.delete("/api/matrix/link")
def unlink_matrix_account():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401

    origin = request.headers.get("Origin")
    if not origin or origin.rstrip("/") != request.host_url.rstrip("/"):
        return jsonify({"error": "Недопустимый источник запроса"}), 403

    with connect() as con:
        cursor = con.execute(
            "DELETE FROM matrix_accounts WHERE user_id = ?",
            (session["user_id"],)
        )

    return jsonify({
        "ok": True,
        "unlinked": cursor.rowcount > 0
    }), 200


@app.post("/api/matrix/link")
def link_matrix_account():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт Rebunar"}), 401

    origin = request.headers.get("Origin")
    if not origin or origin.rstrip("/") != request.host_url.rstrip("/"):
        return jsonify({"error": "Недопустимый источник запроса"}), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Ожидается JSON-объект"}), 400

    access_token = data.get("access_token")
    expected_user_id = data.get("matrix_user_id")
    device_id = data.get("device_id")

    if not isinstance(access_token, str):
        return jsonify({"error": "Некорректный токен Matrix"}), 400

    if not isinstance(expected_user_id, str):
        return jsonify({"error": "Некорректный Matrix ID"}), 400

    if device_id is not None and not isinstance(device_id, str):
        return jsonify({"error": "Некорректный ID устройства"}), 400

    access_token = access_token.strip()
    expected_user_id = expected_user_id.strip()
    device_id = device_id.strip() if device_id else None

    if not access_token or len(access_token) > 8192:
        return jsonify({"error": "Некорректный токен Matrix"}), 400

    if not expected_user_id or len(expected_user_id) > 255:
        return jsonify({"error": "Некорректный Matrix ID"}), 400

    matrix_request = Request(
        "https://matrix.org/_matrix/client/v3/account/whoami",
        headers={"Authorization": "Bearer " + access_token},
        method="GET"
    )

    try:
        with urlopen(matrix_request, timeout=10) as response:
            identity = json.loads(response.read(16384).decode("utf-8"))
    except HTTPError as exc:
        if exc.code in (401, 403):
            return jsonify({"error": "Matrix не подтвердил этот токен"}), 401
        return jsonify({"error": "Ошибка проверки Matrix"}), 502
    except (URLError, TimeoutError, OSError, ValueError):
        return jsonify({"error": "Не удалось проверить аккаунт Matrix"}), 502

    if not isinstance(identity, dict):
        return jsonify({"error": "Matrix вернул некорректный ответ"}), 502

    confirmed_user_id = identity.get("user_id")
    confirmed_device_id = identity.get("device_id")

    if identity.get("is_guest") or not confirmed_user_id:
        return jsonify({"error": "Гостевой или неподтверждённый Matrix-аккаунт"}), 403

    if confirmed_user_id != expected_user_id:
        return jsonify({"error": "Matrix ID не совпадает с подтверждённым аккаунтом"}), 403

    if device_id and confirmed_device_id and device_id != confirmed_device_id:
        return jsonify({"error": "ID устройства Matrix не совпадает"}), 403

    with connect() as con:
        existing_user = con.execute(
            "SELECT matrix_user_id FROM matrix_accounts WHERE user_id = ?",
            (session["user_id"],)
        ).fetchone()

        existing_matrix = con.execute(
            "SELECT user_id FROM matrix_accounts WHERE matrix_user_id = ?",
            (confirmed_user_id,)
        ).fetchone()

        if existing_user and existing_user[0] != confirmed_user_id:
            return jsonify({"error": "Сначала отвяжите предыдущий Matrix-аккаунт"}), 409

        if existing_matrix and existing_matrix[0] != session["user_id"]:
            return jsonify({"error": "Этот Matrix-аккаунт уже привязан к другому пользователю"}), 409

        con.execute(
            """
            INSERT INTO matrix_accounts (user_id, matrix_user_id, device_id)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                device_id = excluded.device_id
            """,
            (session["user_id"], confirmed_user_id, confirmed_device_id or device_id)
        )

    return jsonify({
        "ok": True,
        "matrix_user_id": confirmed_user_id,
        "device_id": confirmed_device_id or device_id
    }), 200


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


@app.post("/api/logout")
def logout():
    presence_id = session.get("presence_id")

    if presence_id:
        with connect() as con:
            con.execute(
                "DELETE FROM user_presence WHERE presence_id = ?",
                (presence_id,)
            )

    session.clear()
    response = jsonify({"logged_in": False})
    response.delete_cookie(
        app.config.get("SESSION_COOKIE_NAME", "session"),
        path=app.config.get("SESSION_COOKIE_PATH") or "/",
        domain=app.config.get("SESSION_COOKIE_DOMAIN"),
        secure=app.config.get("SESSION_COOKIE_SECURE", False),
        httponly=app.config.get("SESSION_COOKIE_HTTPONLY", True),
        samesite=app.config.get("SESSION_COOKIE_SAMESITE"),
    )
    return response, 200


@app.get("/api/communities")
def get_communities():
    with connect() as con:
        con.row_factory = sqlite3.Row
        rows = con.execute("""
            SELECT id, slug, name, description
            FROM communities
            ORDER BY id
        """).fetchall()
    return jsonify([dict(row) for row in rows])


@app.get("/api/posts")
def get_posts():
    slug = request.args.get("community")
    sql = """
        SELECT posts.id, posts.title, posts.body, posts.created_at,
               users.username AS author,
               users.avatar AS avatar,
               COALESCE(profile_progress.equipped_frame, '') AS equipped_frame,
               communities.slug AS community_slug,
               communities.name AS community_name
        FROM posts
        LEFT JOIN users ON users.id = posts.user_id
        LEFT JOIN profile_progress ON profile_progress.user_id = users.id
        LEFT JOIN communities ON communities.id = posts.community_id
    """
    params = []
    if slug:
        sql += " WHERE communities.slug = ?"
        params.append(slug)
    sql += " ORDER BY posts.id DESC LIMIT 100"
    with connect() as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(sql, params).fetchall()
        return jsonify([dict(r) for r in rows])


@app.post("/api/posts")
def create_post():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт, чтобы публиковать"}), 401

    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()[:200]
    body = str(data.get("text", "")).strip()[:10000]
    community_id = data.get("community_id")

    if not title and not body:
        return jsonify({"error": "Публикация пустая"}), 400

    with connect() as con:
        if community_id is not None:
            ok = con.execute(
                "SELECT 1 FROM communities WHERE id = ?", (community_id,)
            ).fetchone()
            if not ok:
                return jsonify({"error": "Такого сообщества нет"}), 400

        cur = con.execute(
            "INSERT INTO posts (title, body, user_id, community_id) VALUES (?, ?, ?, ?)",
            (title, body, session["user_id"], community_id)
        )
        post_id = cur.lastrowid

    return jsonify({
        "id": post_id,
        "title": title,
        "text": body,
        "author": session["username"]
    }), 201


@app.get("/communities.js")
def communities_js():
    return send_from_directory(BASE, "communities.js")


@app.get("/api/membership/<slug>")
def membership_info(slug):
    with connect() as con:
        c = con.execute("SELECT id FROM communities WHERE slug = ?", (slug,)).fetchone()
        if not c:
            return jsonify({"error": "Нет такого сообщества"}), 404
        count = con.execute(
            "SELECT COUNT(*) FROM memberships WHERE community_id = ?", (c[0],)
        ).fetchone()[0]
        joined = False
        if "user_id" in session:
            joined = con.execute(
                "SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?",
                (session["user_id"], c[0])
            ).fetchone() is not None
    return jsonify({"count": count, "joined": joined})


@app.post("/api/join/<slug>")
def join_community(slug):
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт, чтобы вступить"}), 401
    with connect() as con:
        c = con.execute("SELECT id FROM communities WHERE slug = ?", (slug,)).fetchone()
        if not c:
            return jsonify({"error": "Нет такого сообщества"}), 404
        con.execute(
            "INSERT OR IGNORE INTO memberships (user_id, community_id) VALUES (?, ?)",
            (session["user_id"], c[0])
        )
    return membership_info(slug)


@app.post("/api/leave/<slug>")
def leave_community(slug):
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401
    with connect() as con:
        c = con.execute("SELECT id FROM communities WHERE slug = ?", (slug,)).fetchone()
        if not c:
            return jsonify({"error": "Нет такого сообщества"}), 404
        con.execute(
            "DELETE FROM memberships WHERE user_id = ? AND community_id = ?",
            (session["user_id"], c[0])
        )
    return membership_info(slug)


@app.post("/api/messages/send")
def send_message():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    data = request.get_json(silent=True) or {}
    receiver_id = data.get("receiver_id")
    text = str(data.get("text", "")).strip()

    if not receiver_id or not text:
        return jsonify({"error": "Нужны получатель и текст"}), 400

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный получатель"}), 400

    if receiver_id == session["user_id"]:
        return jsonify({"error": "Нельзя отправить сообщение самому себе"}), 400

    with connect() as con:
        user = con.execute(
            "SELECT id FROM users WHERE id = ?", (receiver_id,)
        ).fetchone()

        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        cur = con.execute(
            "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
            (session["user_id"], receiver_id, text)
        )

    return jsonify({"id": cur.lastrowid, "ok": True}), 201



@app.get("/api/messages/self")
def self_messages():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    me = session["user_id"]

    with connect() as con:
        time_column = get_messages_time_column(con)
        rows = con.execute(f"""
            SELECT id, text, {time_column}, image_path
            FROM messages
            WHERE sender_id = ? AND receiver_id = ?
            ORDER BY id ASC
        """, (me, me)).fetchall()

    return jsonify([
        {
            "id": row[0],
            "text": row[1],
            "created_at": row[2],
            "image_url": "/api/messages/self/image/" + row[3] if row[3] else None
        }
        for row in rows
    ]), 200


@app.post("/api/messages/self")
def send_self_message():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Пустое сообщение"}), 400

    text = text[:5000]
    me = session["user_id"]

    with connect() as con:
        cur = con.execute("""
            INSERT INTO messages (sender_id, receiver_id, text)
            VALUES (?, ?, ?)
        """, (me, me, text))

    return jsonify({
        "ok": True,
        "id": cur.lastrowid
    }), 201



@app.post("/api/messages/self/image")
def send_self_image():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    file = request.files.get("image")
    if not file or not file.filename:
        return jsonify({"error": "Выбери фотографию"}), 400

    data = file.read(10 * 1024 * 1024 + 1)
    if len(data) > 10 * 1024 * 1024:
        return jsonify({"error": "Максимальный размер — 10 МБ"}), 413

    if data.startswith(b"\xff\xd8\xff"):
        ext = "jpg"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        ext = "png"
    elif data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        ext = "webp"
    else:
        return jsonify({"error": "Разрешены JPG, PNG и WebP"}), 400

    folder = BASE / "uploads" / "self_notes"
    folder.mkdir(parents=True, exist_ok=True)
    filename = uuid.uuid4().hex + "." + ext
    (folder / filename).write_bytes(data)

    me = session["user_id"]
    with connect() as con:
        cur = con.execute("""
            INSERT INTO messages (sender_id, receiver_id, text, image_path)
            VALUES (?, ?, ?, ?)
        """, (me, me, "[Фото]", filename))

    return jsonify({"ok": True, "id": cur.lastrowid}), 201


@app.get("/api/messages/self/image/<filename>")
def get_self_image(filename):
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    me = session["user_id"]
    with connect() as con:
        row = con.execute("""
            SELECT id FROM messages
            WHERE sender_id = ? AND receiver_id = ? AND image_path = ?
        """, (me, me, filename)).fetchone()

    if not row or Path(filename).name != filename:
        return jsonify({"error": "Фотография не найдена"}), 404

    return send_from_directory(BASE / "uploads" / "self_notes", filename)


@app.delete("/api/messages/self/<int:message_id>")
def delete_self_message(message_id):
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    me = session["user_id"]

    with connect() as con:
        row = con.execute("""
            SELECT image_path FROM messages
            WHERE id = ? AND sender_id = ? AND receiver_id = ?
        """, (message_id, me, me)).fetchone()

        if not row:
            return jsonify({"error": "Заметка не найдена"}), 404

        con.execute("""
            DELETE FROM messages
            WHERE id = ? AND sender_id = ? AND receiver_id = ?
        """, (message_id, me, me))

    if row[0]:
        filename = Path(row[0]).name
        image_file = BASE / "uploads" / "self_notes" / filename
        if filename == row[0] and image_file.is_file():
            image_file.unlink()

    return jsonify({"ok": True}), 200


@app.get("/api/messages/chats")
def message_chats():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    me = session["user_id"]

    with connect() as con:
        time_column = get_messages_time_column(con)
        rows = con.execute(f"""
            SELECT
                u.id,
                u.username,
                u.display_name,
                u.avatar,
                COALESCE(pp.equipped_frame, '') AS equipped_frame,
                m.text,
                m.{time_column} AS created_at
            FROM messages m
            JOIN users u
              ON u.id = CASE
                  WHEN m.sender_id = ? THEN m.receiver_id
                  ELSE m.sender_id
              END
            LEFT JOIN profile_progress pp ON pp.user_id = u.id
            WHERE m.sender_id != m.receiver_id
              AND m.id IN (
                SELECT MAX(m2.id)
                FROM messages m2
                WHERE (m2.sender_id = ? OR m2.receiver_id = ?)
                  AND m2.sender_id != m2.receiver_id
                  AND NOT EXISTS (
                      SELECT 1 FROM hidden_chats h
                      WHERE h.user_id = ?
                        AND h.other_user_id = CASE
                            WHEN m2.sender_id = ? THEN m2.receiver_id
                            ELSE m2.sender_id
                        END
                  )
                GROUP BY CASE
                    WHEN m2.sender_id = ? THEN m2.receiver_id
                    ELSE m2.sender_id
                END
              )
            ORDER BY m.id DESC
        """, (me, me, me, me, me, me)).fetchall()

    return jsonify([
        {
            "user_id": row[0],
            "username": row[1],
            "display_name": row[2] or row[1],
            "avatar": row[3] or "",
            "equipped_frame": row[4] or "",
            "last_message": row[5],
            "created_at": row[6]
        }
        for row in rows
    ])


@app.delete("/api/messages/chats/<int:other_user_id>")
def hide_message_chat(other_user_id):
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    me = session["user_id"]
    if other_user_id == me:
        return jsonify({"error": "Нельзя удалить этот диалог"}), 400

    with connect() as con:
        user = con.execute(
            "SELECT id FROM users WHERE id = ?", (other_user_id,)
        ).fetchone()
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Удаляем только личную переписку этой пары, а не сообщения других пользователей.
        con.execute("""
            DELETE FROM messages
            WHERE (sender_id = ? AND receiver_id = ?)
               OR (sender_id = ? AND receiver_id = ?)
        """, (me, other_user_id, other_user_id, me))

        # Убираем старые скрытия в обе стороны, чтобы новый диалог мог появиться снова.
        con.execute("""
            DELETE FROM hidden_chats
            WHERE (user_id = ? AND other_user_id = ?)
               OR (user_id = ? AND other_user_id = ?)
        """, (me, other_user_id, other_user_id, me))

    return jsonify({"ok": True, "deleted_for_both": True}), 200


@app.get("/api/messages/history")
def message_history():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    chat_with_id = request.args.get("chat_with_id")

    try:
        chat_with_id = int(chat_with_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный пользователь"}), 400

    me = session["user_id"]
    if chat_with_id == me:
        return jsonify({"error": "Нельзя открыть личные заметки как обычный чат"}), 400

    with connect() as con:
        time_column = get_messages_time_column(con)
        rows = con.execute(f"""
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.text,
                m.{time_column} AS created_at,
                u.username,
                u.display_name,
                u.avatar,
                COALESCE(pp.equipped_frame, '') AS equipped_frame
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            LEFT JOIN profile_progress pp ON pp.user_id = u.id
            WHERE
                (m.sender_id = ? AND m.receiver_id = ?)
                OR
                (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.id ASC
        """, (
            me, chat_with_id,
            chat_with_id, me
        )).fetchall()

    return jsonify([
        {
            "id": row[0],
            "sender_id": row[1],
            "receiver_id": row[2],
            "text": row[3],
            "created_at": row[4],
            "username": row[5],
            "display_name": row[6] or row[5],
            "avatar": row[7] or "",
            "equipped_frame": row[8] or ""
        }
        for row in rows
    ])


@app.get("/rebunar.css")
def rebunar_css():
    return send_from_directory(BASE, "rebunar.css")

@app.get("/rebunar-blood.css")
def rebunar_blood_css():
    return send_from_directory(BASE, "rebunar-blood.css")


@app.get("/rebunar-home.js")
def rebunar_home_js():
    return send_from_directory(BASE, "rebunar-home.js")

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5002, debug=False)

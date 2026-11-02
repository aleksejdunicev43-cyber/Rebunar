from pathlib import Path
import sqlite3
import os
import secrets
from datetime import datetime, timezone
from flask import Flask, jsonify, request, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "rebunar.db"
FRONTEND_DIR = BASE_DIR / "frontend"
BUILD_DIR = FRONTEND_DIR / "build"

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("REBOUND_SECRET_KEY") or secrets.token_hex(32)


def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with connect() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL,
                display_name TEXT DEFAULT '',
                bio TEXT DEFAULT '',
                avatar TEXT DEFAULT ''
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS communities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                community_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, community_id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(community_id) REFERENCES communities(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY(sender_id) REFERENCES users(id),
                FOREIGN KEY(receiver_id) REFERENCES users(id)
            )
        """)
        con.execute("""
            CREATE TABLE IF NOT EXISTS hidden_chats (
                user_id INTEGER NOT NULL,
                other_user_id INTEGER NOT NULL,
                PRIMARY KEY(user_id, other_user_id)
            )
        """)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/new")
@app.get("/new/")
def new_app():
    return send_from_directory(BUILD_DIR, "index.html")


@app.get("/new/<path:path>")
def new_static(path):
    return send_from_directory(BUILD_DIR, path)


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or username).strip()

    if not username or not password:
        return jsonify({"error": "Заполни логин и пароль"}), 400

    if not all("а" <= ch.lower() <= "я" or ch in "ёЁ" for ch in display_name):
        return jsonify({"error": "Имя может содержать только русские буквы"}), 400

    with connect() as con:
        exists = con.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if exists:
            return jsonify({"error": "Такой логин уже существует"}), 409

        now = datetime.now(timezone.utc).isoformat()
        cur = con.execute("""
            INSERT INTO users (username, password, created_at, display_name)
            VALUES (?, ?, ?, ?)
        """, (username, generate_password_hash(password), now, display_name))
        user_id = cur.lastrowid

    session["user_id"] = user_id
    return jsonify({"id": user_id, "username": username, "display_name": display_name}), 201


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    with connect() as con:
        user = con.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Неверный логин или пароль"}), 401

    session["user_id"] = user["id"]
    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or user["username"],
        "bio": user["bio"] or "",
        "avatar": user["avatar"] or ""
    })


@app.get("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})

    with connect() as con:
        user = con.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()

    if not user:
        session.clear()
        return jsonify({"logged_in": False})

    return jsonify({
        "logged_in": True,
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or user["username"],
        "bio": user["bio"] or "",
        "avatar": user["avatar"] or ""
    })


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/profile")
def profile():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    with connect() as con:
        user = con.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()

    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"] or user["username"],
        "bio": user["bio"] or "",
        "avatar": user["avatar"] or ""
    })


@app.post("/api/profile")
def update_profile():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    data = request.get_json(silent=True) or {}
    display_name = (data.get("display_name") or "").strip()
    bio = (data.get("bio") or "").strip()

    with connect() as con:
        con.execute("""
            UPDATE users
            SET display_name = ?, bio = ?
            WHERE id = ?
        """, (display_name, bio, session["user_id"]))

    return jsonify({"ok": True})


@app.get("/api/users/search")
def users_search():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify([])

    with connect() as con:
        rows = con.execute("""
            SELECT id, username, display_name, avatar
            FROM users
            WHERE username LIKE ? OR display_name LIKE ?
            ORDER BY id DESC
            LIMIT 30
        """, (f"%{query}%", f"%{query}%")).fetchall()

    return jsonify([
        {
            "id": row[0],
            "username": row[1],
            "display_name": row[2] or row[1],
            "avatar": row[3] or ""
        }
        for row in rows
    ])


@app.get("/api/communities")
def communities():
    with connect() as con:
        rows = con.execute("""
            SELECT id, name, description, created_at
            FROM communities
            ORDER BY id DESC
        """).fetchall()

    return jsonify([
        {
            "id": row[0],
            "name": row[1],
            "description": row[2] or "",
            "created_at": row[3]
        }
        for row in rows
    ])


@app.post("/api/communities/<int:community_id>/join")
def community_join(community_id):
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    with connect() as con:
        con.execute("""
            INSERT OR IGNORE INTO memberships (user_id, community_id, created_at)
            VALUES (?, ?, ?)
        """, (session["user_id"], community_id, datetime.now(timezone.utc).isoformat()))

    return jsonify({"ok": True})


@app.delete("/api/communities/<int:community_id>/join")
def community_leave(community_id):
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    with connect() as con:
        con.execute("""
            DELETE FROM memberships
            WHERE user_id = ? AND community_id = ?
        """, (session["user_id"], community_id))

    return jsonify({"ok": True})


@app.get("/api/messages/chats")
def message_chats():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    me = session["user_id"]

    with connect() as con:
        rows = con.execute("""
            SELECT
                u.id,
                u.username,
                u.display_name,
                u.avatar,
                m.text,
                m.timestamp AS created_at
            FROM messages m
            JOIN users u
              ON u.id = CASE
                  WHEN m.sender_id = ? THEN m.receiver_id
                  ELSE m.sender_id
              END
            WHERE m.id IN (
                SELECT MAX(m2.id)
                FROM messages m2
                WHERE (m2.sender_id = ?
                   OR m2.receiver_id = ?)
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
            "last_message": row[4],
            "created_at": row[5]
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
        con.execute("""
            INSERT OR IGNORE INTO hidden_chats (user_id, other_user_id)
            VALUES (?, ?)
        """, (me, other_user_id))

    return jsonify({"ok": True}), 200


@app.get("/api/messages/history")
def message_history():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    chat_with_id = request.args.get("chat_with_id")

    try:
        chat_with_id = int(chat_with_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный пользователь"}), 400

    with connect() as con:
        rows = con.execute("""
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.text,
                m.timestamp AS created_at,
                u.username,
                u.display_name,
                u.avatar
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE
                (m.sender_id = ? AND m.receiver_id = ?)
                OR
                (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.id ASC
        """, (
            session["user_id"], chat_with_id,
            chat_with_id, session["user_id"]
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
            "avatar": row[7] or ""
        }
        for row in rows
    ])


@app.post("/api/messages/send")
def message_send():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    data = request.get_json(silent=True) or {}
    receiver_id = data.get("receiver_id")
    text = (data.get("text") or "").strip()

    try:
        receiver_id = int(receiver_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Некорректный получатель"}), 400

    if receiver_id == session["user_id"]:
        return jsonify({"error": "Нельзя отправить сообщение самому себе"}), 400

    if not text:
        return jsonify({"error": "Сообщение не может быть пустым"}), 400

    with connect() as con:
        receiver = con.execute("SELECT id FROM users WHERE id = ?", (receiver_id,)).fetchone()
        if not receiver:
            return jsonify({"error": "Пользователь не найден"}), 404

        now = datetime.now(timezone.utc).isoformat()
        cur = con.execute("""
            INSERT INTO messages (sender_id, receiver_id, text, timestamp)
            VALUES (?, ?, ?, ?)
        """, (session["user_id"], receiver_id, text, now))

    return jsonify({"ok": True, "id": cur.lastrowid, "created_at": now}), 201


@app.get("/api/messages/self")
def self_messages():
    if "user_id" not in session:
        return jsonify({"error": "Войди в аккаунт"}), 401

    return jsonify([])


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5002, debug=False)

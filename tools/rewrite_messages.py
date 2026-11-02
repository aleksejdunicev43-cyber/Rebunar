from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server.py"
VIEW = ROOT / "frontend" / "features" / "messages" / "view.js"


def replace_function(source, decorator_pattern, new_block, label):
    pattern = rf'{decorator_pattern}.*?(?=\n@app\.|\Z)'
    match = re.search(pattern, source, re.S)
    if not match:
        raise SystemExit(f"ОШИБКА: {label} не найден")
    return source[:match.start()] + new_block.rstrip() + source[match.end():]


server = SERVER.read_text()
backup = SERVER.with_name("server.py.before_messages_rewrite")
if not backup.exists():
    backup.write_text(server)

helper = '''\n\ndef get_messages_time_column(con):
    columns = {row[1] for row in con.execute("PRAGMA table_info(messages)").fetchall()}
    if "created_at" in columns:
        return "created_at"
    if "timestamp" in columns:
        return "timestamp"
    raise RuntimeError("В таблице messages нет created_at или timestamp")
'''
if "def get_messages_time_column(con):" not in server:
    marker = "app = Flask(__name__)"
    if marker not in server:
        raise SystemExit("ОШИБКА: Flask app не найден")
    server = server.replace(marker, marker + helper, 1)

self_block = '''@app.get("/api/messages/self")
def self_messages():
    if "user_id" not in session:
        return jsonify({"error": "Необходимо войти в аккаунт"}), 401

    me = session["user_id"]

    with connect() as con:
        time_column = get_messages_time_column(con)
        rows = con.execute(f"""
            SELECT id, text, {time_column} AS created_at, image_path
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
'''
server = replace_function(server, r'@app\.get\("/api/messages/self"\)\ndef self_messages\(\):', self_block, "self_messages")

chats_block = '''@app.get("/api/messages/chats")
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
                m.text,
                m.{time_column} AS created_at
            FROM messages m
            JOIN users u
              ON u.id = CASE
                  WHEN m.sender_id = ? THEN m.receiver_id
                  ELSE m.sender_id
              END
            WHERE m.sender_id != m.receiver_id
              AND m.id IN (
                SELECT MAX(m2.id)
                FROM messages m2
                WHERE (m2.sender_id = ? OR m2.receiver_id = ?)
                  AND m2.sender_id != m2.receiver_id
                  AND NOT EXISTS (
                      SELECT 1
                      FROM hidden_chats h
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
    ]), 200
'''
server = replace_function(server, r'@app\.get\("/api/messages/chats"\)\ndef message_chats\(\):', chats_block, "message_chats")

history_block = '''@app.get("/api/messages/history")
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
        return jsonify({"error": "Для личных заметок используй Избранное"}), 400

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
                u.avatar
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE
                (m.sender_id = ? AND m.receiver_id = ?)
                OR
                (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.id ASC
        """, (me, chat_with_id, chat_with_id, me)).fetchall()

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
    ]), 200
'''
server = replace_function(server, r'@app\.get\("/api/messages/history"\)\ndef message_history\(\):', history_block, "message_history")

SERVER.write_text(server)

# Frontend improvements: safer refresh behavior and mobile chat state.
view = VIEW.read_text()
view = view.replace(
    "function getChatName(chat) {\n  return chat.display_name || chat.username || 'Пользователь';\n}",
    "function getChatName(chat) {\n  return chat.display_name || chat.username || 'Пользователь';\n}\n\nfunction formatMessageTime(value) {\n  if (!value) return '';\n  const date = new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z'));\n  if (Number.isNaN(date.getTime())) return String(value);\n  return date.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });\n}"
)
view = view.replace('escapeHTML(chat.created_at || \'\')', 'escapeHTML(formatMessageTime(chat.created_at))')
view = view.replace('escapeHTML(message.created_at || \'\')', 'escapeHTML(formatMessageTime(message.created_at))')
view = view.replace('escapeHTML(note.created_at || \'\')', 'escapeHTML(formatMessageTime(note.created_at))')
view = view.replace(
    "<input name=\"text\" maxlength=\"5000\" placeholder=\"Сообщение...\" autocomplete=\"off\" required>",
    "<input name=\"text\" maxlength=\"5000\" placeholder=\"Сообщение...\" autocomplete=\"off\" enterkeyhint=\"send\" required>"
)
VIEW.write_text(view)


# Additional reliability improvements for the message screen.
view = VIEW.read_text()

def replace_once(source, old, new, label):
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"ОШИБКА frontend {label}: найдено {count}, ожидалось 1")
    return source.replace(old, new, 1)

view = replace_once(
    view,
    "let screenController = null;",
    "let screenController = null;\nlet conversationRequestToken = 0;\nlet searchRequestToken = 0;\nlet lastHistorySnapshot = '';",
    "request tokens"
)

view = replace_once(
    view,
    "const favoritePreview = notes.length\n    ? notes[0].text",
    "const favoritePreview = notes.length\n    ? notes[notes.length - 1].text",
    "latest favorite preview"
)

view = replace_once(
    view,
    "async function openChat(user) {\n  activeChat = user;",
    "async function openChat(user) {\n  const requestToken = ++conversationRequestToken;\n  lastHistorySnapshot = '';\n  activeChat = user;",
    "chat request token"
)

view = replace_once(
    view,
    "  try {\n    renderMessages(await getChatHistory(user.user_id));\n  } catch (error) {\n    showStatus(conversation.querySelector('[data-message-list]'), error.message);\n  }",
    "  try {\n    const history = await getChatHistory(user.user_id);\n    if (requestToken !== conversationRequestToken || activeChat?.user_id !== user.user_id) return;\n    lastHistorySnapshot = JSON.stringify(history);\n    renderMessages(history);\n  } catch (error) {\n    if (requestToken === conversationRequestToken) showStatus(conversation.querySelector('[data-message-list]'), error.message);\n  }",
    "chat response guard"
)

view = replace_once(
    view,
    "async function openFavorite() {\n  activeChat = { kind: 'favorite' };",
    "async function openFavorite() {\n  ++conversationRequestToken;\n  lastHistorySnapshot = '';\n  activeChat = { kind: 'favorite' };",
    "favorite request guard"
)

view = replace_once(
    view,
    "  search.addEventListener('input', () => {\n    clearTimeout(searchTimer);",
    "  search.addEventListener('input', () => {\n    const currentSearchToken = ++searchRequestToken;\n    clearTimeout(searchTimer);",
    "search request token"
)

view = replace_once(
    view,
    "        const users = await searchUsers(query);\n        if (token !== screenToken) return;",
    "        const users = await searchUsers(query);\n        if (token !== screenToken || currentSearchToken !== searchRequestToken) return;",
    "stale search guard"
)

view = replace_once(
    view,
    "    if (event.target.closest('[data-back]')) {\n      activeChat = null;",
    "    if (event.target.closest('[data-back]')) {\n      ++conversationRequestToken;\n      lastHistorySnapshot = '';\n      activeChat = null;",
    "back navigation guard"
)

view = replace_once(
    view,
    "        await sendMessage(activeChat.user_id, text);\n        input.value = '';\n        renderMessages(await getChatHistory(activeChat.user_id));\n        await loadChats();",
    "        const recipientId = Number(activeChat.user_id);\n        const sentTo = await sendMessage(recipientId, text);\n        input.value = '';\n        if (activeChat?.user_id === recipientId) {\n          const history = await getChatHistory(recipientId);\n          lastHistorySnapshot = JSON.stringify(history);\n          renderMessages(history);\n        }\n        await loadChats();",
    "send refresh"
)

view = replace_once(
    view,
    "      } else if (activeChat?.user_id) {\n        renderMessages(await getChatHistory(activeChat.user_id));\n      }",
    "      } else if (activeChat?.user_id) {\n        const currentId = Number(activeChat.user_id);\n        const history = await getChatHistory(currentId);\n        if (activeChat?.user_id === currentId) {\n          const snapshot = JSON.stringify(history);\n          if (snapshot !== lastHistorySnapshot) {\n            lastHistorySnapshot = snapshot;\n            renderMessages(history);\n          }\n        }\n      }",
    "polling without redraw"
)

VIEW.write_text(view)

# Validate source files and rebuild the production frontend when available.
subprocess.run(["python", "-m", "py_compile", str(SERVER)], check=True)

package = ROOT / "package.json"
if package.exists():
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)

print("MESSAGES REWRITE: OK")
print("BACKEND: compatible with created_at/timestamp")
print("SELF NOTES: excluded from normal chats")
print("HISTORY: self-chat blocked")
print("FRONTEND: message times + mobile/send improvements")

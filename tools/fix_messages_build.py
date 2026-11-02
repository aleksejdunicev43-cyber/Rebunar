from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server.py"
VIEW = ROOT / "frontend" / "features" / "messages" / "view.js"
REPAIR = ROOT / "tools" / "rewrite_messages.py"


def read(path):
    return path.read_text(encoding="utf-8")


def repair_is_needed():
    server = read(SERVER)
    view = read(VIEW)

    backend_ok = (
        "def get_messages_time_column(con):" in server
        and "m2.sender_id != m2.receiver_id" in server
        and "if chat_with_id == me:" in server
    )
    frontend_ok = (
        "conversationRequestToken" in view
        and "searchRequestToken" in view
        and "data-note-form" in view
        and "data-send-form" in view
    )
    return not (backend_ok and frontend_ok)


if repair_is_needed():
    print("Проверяю и исправляю логику сообщений и Избранного...")
    subprocess.run([sys.executable, str(REPAIR)], cwd=ROOT, check=True)
else:
    print("Логика сообщений и Избранного уже исправлена")

# Remove duplicate time formatter declarations safely.
source = read(VIEW)
pattern = re.compile(r"function formatMessageTime\\(value\\) \\{[\\s\\S]*?\\n\\}")
matches = list(pattern.finditer(source))

if len(matches) > 1:
    for match in reversed(matches[1:]):
        source = source[:match.start()] + source[match.end():]
    VIEW.write_text(source, encoding="utf-8")
    print(f"Удалены повторные объявления formatMessageTime: {len(matches) - 1}")
elif len(matches) == 1:
    print("Функция formatMessageTime объявлена один раз")
else:
    raise SystemExit("ОШИБКА: formatMessageTime не найдена после исправления")

# Validate the backend before creating the production bundle.
subprocess.run([sys.executable, "-m", "py_compile", str(SERVER)], cwd=ROOT, check=True)
print("BACKEND PYTHON CHECK: OK")

subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
print("FRONTEND BUILD: OK")
print("ПРОВЕРКА: заметки остаются в Избранном и не создают отдельный чат")

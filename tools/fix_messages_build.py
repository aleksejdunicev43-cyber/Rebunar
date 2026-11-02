from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
view_path = root / "frontend" / "features" / "messages" / "view.js"
source = view_path.read_text(encoding="utf-8")

pattern = re.compile(r"function formatMessageTime\(value\) \{[\s\S]*?\n\}")
matches = list(pattern.finditer(source))

if len(matches) > 1:
    for match in reversed(matches[1:]):
        source = source[:match.start()] + source[match.end():]
    view_path.write_text(source, encoding="utf-8")
    print(f"Удалены повторные объявления: {len(matches) - 1}")
elif len(matches) == 1:
    print("Функция времени уже объявлена один раз")
else:
    raise SystemExit("ОШИБКА: функция formatMessageTime не найдена; файл не изменён")

subprocess.run(["npm", "run", "build"], cwd=root, check=True)
print("FRONTEND BUILD: OK")

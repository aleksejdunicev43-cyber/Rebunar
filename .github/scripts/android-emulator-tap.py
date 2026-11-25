import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

artifact_dir = Path("artifacts/android-emulator")
xml_path = artifact_dir / "02-ui-hierarchy.xml"
tree = ET.parse(xml_path)
candidates = []

for node in tree.getroot().iter("node"):
    if node.attrib.get("package") != "ru.rebunar.app":
        continue
    if node.attrib.get("clickable") != "true":
        continue
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.attrib.get("bounds", ""))
    if not match:
        continue
    x1, y1, x2, y2 = map(int, match.groups())
    if x2 > x1 and y2 > y1:
        label = node.attrib.get("text") or node.attrib.get("content-desc") or ""
        candidates.append((x1, y1, x2, y2, label))

if candidates:
    x1, y1, x2, y2, label = candidates[0]
    x, y = (x1 + x2) // 2, (y1 + y2) // 2
    (artifact_dir / "05-tap.txt").write_text(
        f"Tapped Rebunar target: {label!r} at ({x},{y})\n", encoding="utf-8"
    )
    subprocess.run(["adb", "shell", "input", "tap", str(x), str(y)], check=True)
    time.sleep(3)
    with (artifact_dir / "06-after-tap.png").open("wb") as image_file:
        subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=image_file, check=True)
else:
    (artifact_dir / "05-tap.txt").write_text(
        "No clickable Rebunar app control was exposed by UIAutomator. "
        "System dialogs are intentionally ignored.\n", encoding="utf-8"
    )

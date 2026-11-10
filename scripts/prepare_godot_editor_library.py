#!/usr/bin/env python3
"""Prepare Godot's Android Editor module for a single Rebunar APK.

The Godot checkout remains the Gradle root so its upstream SDK/plugin versions,
native-library paths and build configuration stay authoritative. The Rebunar
application is included as an additional Android application module.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}, found {count}")
    return text.replace(old, new, 1)


def remove_gradle_block(text: str, marker: str, label: str) -> str:
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"Could not find Gradle block: {label}")
    brace = text.find("{", start)
    if brace < 0:
        raise SystemExit(f"Malformed Gradle block: {label}")
    depth = 0
    quote = None
    escaped = False
    for i in range(brace, len(text)):
        ch = text[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in ("'", '"'):
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] in "\r\n":
                    end += 1
                return text[:start] + text[end:]
    raise SystemExit(f"Unclosed Gradle block: {label}")


def patch_editor_gradle(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "id 'com.android.application'",
        "id 'com.android.library'",
        "Godot editor Android plugin",
    )
    for line in (
        '        applicationId "org.godotengine.editor.v4"\n',
        "        versionCode generateVersionCode()\n",
        "        versionName generateVersionName()\n",
    ):
        if line not in text:
            raise SystemExit(f"Missing expected app-only editor setting: {line.strip()}")
        text = text.replace(line, "", 1)

    # These settings exist only for a separately installable application.
    text = remove_gradle_block(text, "    signingConfigs {", "editor signingConfigs")
    text = remove_gradle_block(text, "    buildTypes {", "editor buildTypes")
    text = remove_gradle_block(text, "        horizonos {", "HorizonOS flavor")
    text = remove_gradle_block(text, "        picoos {", "PicoOS flavor")

    text = text.replace(
        '    horizonosImplementation "org.godotengine:godot-openxr-vendors-meta:$versions.openxrVendorsVersion"\n',
        "",
    )
    text = text.replace(
        '    picoosImplementation "org.godotengine:godot-openxr-vendors-pico:$versions.openxrVendorsVersion"\n',
        "",
    )
    path.write_text(text, encoding="utf-8")


def patch_editor_manifest(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    for pattern, label in (
        (r"<queries\b[\s\S]*?</queries>", "editor package visibility queries"),
        (r"<supports-screens\b[\s\S]*?/>", "editor supports-screens declaration"),
        (r"<activity-alias\b[\s\S]*?</activity-alias>", "standalone editor launcher alias"),
    ):
        text, count = re.subn(r"\s*" + pattern, "", text, count=1)
        if count != 1:
            raise SystemExit(f"Expected one {label}, found {count}")

    text, install_location_count = re.subn(
        r'\s+android:installLocation="auto"',
        "",
        text,
        count=1,
    )
    if install_location_count != 1:
        raise SystemExit(
            f"Expected one editor installLocation attribute, found {install_location_count}"
        )
    for attr in (
        '        android:allowBackup="false"\n',
        '        android:icon="@mipmap/themed_icon"\n',
        '        android:label="${editorAppName}${editorBuildSuffix}"\n',
        '        android:requestLegacyExternalStorage="true"\n',
        '        android:theme="@style/GodotEditorSplashScreenTheme"\n',
    ):
        if attr not in text:
            raise SystemExit(f"Missing expected editor manifest attribute: {attr.strip()}")
        text = text.replace(attr, "", 1)

    # Rebunar owns the merged application theme. Keep Godot's editor theme on
    # its internal Activity so the editor does not inherit the WebView theme.
    activity_anchor = (
        '        <activity\n'
        '            android:name=".GodotEditor"\n'
    )
    activity_with_theme = (
        activity_anchor
        + '            android:theme="@style/GodotEditorSplashScreenTheme"\n'
    )
    text = replace_once(
        text,
        activity_anchor,
        activity_with_theme,
        "GodotEditor activity declaration",
    )

    # Android 11 (API 30) predates singleInstancePerTask (API 31).
    # The editor only needs one dedicated task in this integrated app, so
    # singleTask preserves the intended task isolation on Android 11 devices.
    text = replace_once(
        text,
        '            android:launchMode="singleInstancePerTask"\n',
        '            android:launchMode="singleTask"\\n',
        "Android 11-compatible GodotEditor launch mode",
    )
    path.write_text(text, encoding="utf-8")


def patch_godot_settings(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "include ':assetPackInstallTime'\n"
    if marker not in text:
        raise SystemExit("Could not find the pinned Godot Android settings include marker")
    addition = (
        marker
        + "\n// Rebunar's existing app is built inside the upstream Godot Gradle project.\n"
        + "def rebunarProjectPath = System.getenv('REBUNAR_ANDROID_PROJECT')\n"
        + "if (rebunarProjectPath == null || rebunarProjectPath.isEmpty()) {\n"
        + "    throw new GradleException('REBUNAR_ANDROID_PROJECT must point to the Rebunar Android project')\n"
        + "}\n"
        + "include ':rebunarApp'\n"
        + "project(':rebunarApp').projectDir = new File(rebunarProjectPath, 'app')\n"
        + "project(':rebunarApp').buildFileName = 'build.gradle.kts'\n"
    )
    text = replace_once(text, marker, addition, "Godot Android asset-pack include")
    path.write_text(text, encoding="utf-8")


def patch_rebunar_project(android_project: Path, godot_root: Path) -> None:
    app_gradle = android_project / "app/build.gradle.kts"
    app_text = app_gradle.read_text(encoding="utf-8")
    app_text = replace_once(app_text, "    compileSdk = 35", "    compileSdk = 36", "Rebunar compileSdk")
    app_text = replace_once(
        app_text,
        "        versionName = \"0.1.6\"\n",
        "        versionName = \"0.1.6\"\n"
        '        missingDimensionStrategy("android_distribution", "android")\n'
        '        missingDimensionStrategy("products", "editor")\n',
        "Rebunar versionName",
    )
    app_text = replace_once(
        app_text,
        '    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")',
        '    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")\n'
        '    implementation(project(":editor"))',
        "Rebunar app dependencies",
    )
    app_text = replace_once(
        app_text,
        "    }\n}\n\ndependencies {",
        "    }\n\n"
        "    // Godot OpenXR brings the loader through two Android artifacts.\n"
        "    // Keep one ABI-compatible copy in the combined Rebunar APK.\n"
        "    packaging {\n"
        "        jniLibs {\n"
        '            pickFirsts += setOf("**/libopenxr_loader.so")\n'
        "        }\n"
        "    }\n"
        "}\n\ndependencies {",
        "Rebunar native OpenXR loader packaging rule",
    )
    app_gradle.write_text(app_text, encoding="utf-8")

    editor_gradle = godot_root / "platform/android/java/editor/build.gradle"
    editor_manifest = godot_root / "platform/android/java/editor/src/main/AndroidManifest.xml"
    settings = godot_root / "platform/android/java/settings.gradle"
    patch_editor_gradle(editor_gradle)
    patch_editor_manifest(editor_manifest)
    patch_godot_settings(settings)

    # MainActivity already owns the deep-link bridge. Do not inject a second
    # WebView handler here: doing so shadows openGodotEditor() and launches the
    # editor without the required command_line_params extra.
    activity = android_project / "app/src/main/java/ru/rebunar/app/MainActivity.kt"
    kotlin = activity.read_text(encoding="utf-8")
    required_bridge = (
        'if (uri.scheme == "rebunar" && uri.host == "studio" && uri.path == "/editor")',
        "openGodotEditor()",
        'putExtra("command_line_params", arrayOf("--project-manager"))',
    )
    for marker in required_bridge:
        if marker not in kotlin:
            raise SystemExit(f"Missing required Rebunar Godot launch bridge: {marker}")
    if "startActivity(Intent(this@MainActivity, GodotEditor::class.java))" in kotlin:
        raise SystemExit("Unsafe duplicate Godot launch handler detected in MainActivity")



def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--android-project", type=Path, required=True)
    parser.add_argument("--godot-root", type=Path, required=True)
    args = parser.parse_args()
    android_project = args.android_project.resolve()
    godot_root = args.godot_root.resolve()
    if not (android_project / "app/build.gradle.kts").is_file():
        raise SystemExit(f"Rebunar Android project not found: {android_project}")
    if not (godot_root / "platform/android/java/editor/build.gradle").is_file():
        raise SystemExit(f"Godot Android source not found: {godot_root}")
    patch_rebunar_project(android_project, godot_root)
    print("Prepared the upstream Godot Editor library and included Rebunar as one Android app.")


if __name__ == "__main__":
    main()

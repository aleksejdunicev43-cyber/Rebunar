#!/usr/bin/env python3
"""Prepare the pinned upstream Godot Android Editor as an embeddable Rebunar module.

This script only edits the temporary Android source checkout used by the integration
CI job. It does not rewrite the upstream Godot checkout or the production branch.
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
    text = path.read_text()
    text = replace_once(
        text,
        "id 'com.android.application'",
        "id 'com.android.library'",
        "Android editor application plugin",
    )
    for line in (
        '        applicationId "org.godotengine.editor.v4"\n',
        "        versionCode generateVersionCode()\n",
        "        versionName generateVersionName()\n",
    ):
        if line not in text:
            raise SystemExit(f"Missing expected editor Gradle setting: {line.strip()}")
        text = text.replace(line, "", 1)

    text = remove_gradle_block(text, "    signingConfigs {", "signingConfigs")
    text = remove_gradle_block(text, "    buildTypes {", "buildTypes")
    text = remove_gradle_block(text, "        horizonos {", "horizonos distribution flavor")
    text = remove_gradle_block(text, "        picoos {", "picoos distribution flavor")
    path.write_text(text)


def patch_editor_manifest(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\s*<supports-screens\b[\s\S]*?/>", "", text, count=1)
    text = re.sub(r"\s*<activity-alias\b[\s\S]*?</activity-alias>", "", text, count=1)
    text = text.replace('    android:installLocation="auto"\n', "")
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
    activity = re.search(r'(<activity\s+android:name="\.GodotEditor"[^>]*)(>)', text)
    if not activity:
        raise SystemExit("Could not find the GodotEditor activity declaration")
    replacement = activity.group(1) + ' android:theme="@style/GodotEditorSplashScreenTheme"' + activity.group(2)
    text = text[:activity.start()] + replacement + text[activity.end():]
    path.write_text(text, encoding="utf-8")


def patch_rebunar_project(android_project: Path, godot_root: Path) -> None:
    settings = android_project / "settings.gradle.kts"
    text = settings.read_text()
    text = replace_once(
        text,
        "    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n",
        "    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n"
        "    plugins {\n"
        '        id("com.android.application") version "8.7.3"\n'
        '        id("com.android.library") version "8.7.3"\n'
        '        id("org.jetbrains.kotlin.android") version "2.1.21"\n'
        '        id("io.github.gradle-nexus.publish-plugin") version "1.3.0"\n'
        "    }\n",
        "plugin management repositories",
    )
    text = replace_once(
        text,
        'include(":app")',
        'include(":app", ":lib", ":editor")\n'
        'val godotSourceDir = System.getenv("GODOT_SOURCE_DIR")?.let { File(it) }\n'
        '    ?: throw GradleException("GODOT_SOURCE_DIR is required")\n'
        'project(":lib").projectDir = File(godotSourceDir, "platform/android/java/lib")\n'
        'project(":editor").projectDir = File(godotSourceDir, "platform/android/java/editor")',
        "app-only Gradle module list",
    )
    settings.write_text(text)

    # Keep Godot's upstream root Gradle configuration, but evaluate its Android
    # modules inside the Rebunar app's Gradle project.
    root_build = android_project / "build.gradle.kts"
    if root_build.exists():
        root_build.unlink()
    groovy_build = android_project / "build.gradle"
    groovy_build.write_text(
        """def godotSourceDir = new File(System.getenv('GODOT_SOURCE_DIR'))
apply from: new File(godotSourceDir, 'platform/android/java/app/config.gradle')

ext {
    PUBLISH_VERSION = "4.7.2-stable"
    ossrhGroupId = "org.godotengine"
    supportedAbis = ["arm32", "arm64", "x86_32", "x86_64"]
    supportedFlavors = ["editor", "template"]
    supportedAndroidDistributions = ["android"]
    supportedFlavorsBuildTypes = [
        "editor": ["debug", "release"],
        "template": ["debug", "release"]
    ]
    supportedEditions = ["standard"]
    selectedAbis = ["arm64"]
    detectedAbis = ["arm64-v8a"]
    rootDir = godotSourceDir.absolutePath
    binDir = new File(godotSourceDir, "bin").absolutePath + "/"
    androidEditorBuildsDir = new File(godotSourceDir, "bin/android_editor_builds").absolutePath + "/"
}
ext["signing.keyId"] = ""
ext["signing.password"] = ""
ext["signing.key"] = ""

gradle.startParameter.excludedTaskNames += ":lib:compileGodotNativeLibsEditorDebugArm64"

def getSconsTaskName(String flavor, String buildType, String abi) {
    return "compileGodotNativeLibs" + flavor.capitalize() + buildType.capitalize() + abi.capitalize()
}
""",
        encoding="utf-8",
    )

    app_gradle = android_project / "app/build.gradle.kts"
    app_text = app_gradle.read_text()
    app_text = replace_once(app_text, "    compileSdk = 35", "    compileSdk = 36", "app compileSdk")
    app_text = replace_once(
        app_text,
        "        versionName = \"0.1.6\"",
        "        versionName = \"0.1.6\"\n"
        '        missingDimensionStrategy("android_distribution", "android")\n'
        '        missingDimensionStrategy("products", "editor")',
        "app versionName",
    )
    app_text = replace_once(
        app_text,
        '    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")',
        '    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")\n'
        '    implementation(project(":editor"))',
        "app dependencies",
    )
    app_gradle.write_text(app_text)

    editor_gradle = godot_root / "platform/android/java/editor/build.gradle"
    editor_manifest = godot_root / "platform/android/java/editor/src/main/AndroidManifest.xml"
    patch_editor_gradle(editor_gradle)
    patch_editor_manifest(editor_manifest)

    # Add a narrowly-scoped internal route from the Rebunar WebView to the native
    # editor. The Studio dashboard can expose this route once the APK passes CI.
    activity = android_project / "app/src/main/java/ru/rebunar/app/MainActivity.kt"
    kotlin = activity.read_text()
    kotlin = replace_once(
        kotlin,
        "import java.util.Locale",
        "import java.util.Locale\nimport org.godotengine.editor.GodotEditor",
        "MainActivity imports",
    )
    anchor = "                val uri = request?.url ?: return true\n\n"
    handler = (
        "                val uri = request?.url ?: return true\n\n"
        '                if (uri.scheme == "rebunar" && uri.host == "studio" && uri.path == "/editor") {\n'
        "                    startActivity(Intent(this@MainActivity, GodotEditor::class.java))\n"
        "                    return true\n"
        "                }\n\n"
    )
    kotlin = replace_once(kotlin, anchor, handler, "WebView URL dispatch")
    activity.write_text(kotlin)


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
    print("Prepared Godot Editor as an internal Rebunar Android module.")


if __name__ == "__main__":
    main()

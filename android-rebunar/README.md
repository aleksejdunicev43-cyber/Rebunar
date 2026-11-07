# Rebunar Android

This is the Android shell for the existing Rebunar web application.

## Architecture

- The APK loads the existing application at https://rebunar.pythonanywhere.com/new.
- Authentication, API requests, database records and Matrix integration remain on the existing server.
- The APK does not contain the database, Flask secret key, passwords, or backend credentials.
- The WebView accepts first-party navigation only on the exact HTTPS host. Other HTTP(S) links are opened externally.
- JavaScript is enabled for the application; no JavaScript bridge is exposed to web content.
- Third-party cookies and mixed HTTP content are disabled.
- Android file selection is supported for existing web upload controls.
- The native Android toolbar and its refresh action are not displayed; the WebView occupies the app content area directly.

## Updates

Web UI changes appear after the updated frontend build has been deployed to PythonAnywhere. A GitHub commit alone does not publish files to the live server. Native Android changes require a new APK.

## Build

The GitHub Actions workflow builds a debug APK and uploads it as an artifact. Install it only after the workflow completes successfully.

## Limitations

- The application requires an internet connection; this first version is not an offline client.
- The WebView uses the server's existing session cookies. Server-side cookie and CSRF behavior must be tested on a real device.
- The APK does not add Bluetooth Mesh functionality. That remains a separate prototype until integrated deliberately.


## Embedded Godot runtime (prototype)

The Android APK can host the official Godot Android runtime directly in Rebunar:

- Runtime dependency: `org.godotengine:godot:4.7.2.stable` (MIT-licensed).
- The native workspace is opened only through the first-party deep link `rebunar://studio/godot`.
- The WebView identifies the APK with the `RebunarAndroid` user-agent marker; the deep link is handled natively and is not exposed through a JavaScript bridge.
- Godot is hosted in a dedicated AndroidX `GodotFragment` inside `GodotStudioActivity`.
- A tiny 2D scene in `app/src/main/assets/` verifies rendering and touch input without external assets.
- The first prototype is a runtime test, **not the full Godot Editor**. Rebunar's own editor UI remains separate and will be connected to the engine incrementally.
- Godot currently runs in landscape. The Activity handles orientation and screen-size configuration changes to avoid the engine lifecycle crash documented by Godot.
- Expect the APK to grow significantly because the Godot runtime includes native engine libraries.

Godot embedding reference: https://docs.godotengine.org/en/stable/tutorials/platform/android/embedding_in_android_projects.html

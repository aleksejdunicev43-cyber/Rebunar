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

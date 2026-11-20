# Rebunar architecture map

This document describes the current repository layout as inspected on 2026-11-20.
It is a navigation guide, not a claim that every legacy file is unused.

## Main application entry

- `frontend/index.html` is the Vite frontend entry document.
- `frontend/app/app.js` initializes the application, imports feature screens and styles, sets up authentication, navigation, presence, theme, and Matrix callbacks.
- `frontend/app/router.js` contains route registration, navigation, and route subscriptions.
- `frontend/layout/shell.js` creates the shared application shell and header.
- `frontend/layout/navigation.js` initializes navigation controls.

## Frontend layers

### Shared infrastructure

- `frontend/shared/api/client.js`: shared HTTP request client.
- `frontend/shared/avatar.js` and `avatar.css`: shared avatar rendering.
- `frontend/shared/theme.js`: theme initialization.
- `frontend/infrastructure/matrix/`: Matrix client, connection, messages, API and SSO integration.

### Feature modules

Each feature is grouped under `frontend/features/<feature>/`. The current feature folders include:

- `auth`: authentication API, session, view and styles.
- `home`: home screen.
- `profile`: profile API, view, enhancements and styles.
- `messages`: chat API, view and styles.
- `reader`: reader view and styles.
- `communities`: community view and styles.
- `favorites`: favorites view and styles.
- `ecosystem`: ecosystem view and styles.
- `games`: games view and styles.
- `settings`: settings view and styles.
- `statistics`: statistics API, presence, view and styles.
- `users`: users API, list, public profile and styles.

Feature views should call their feature API module or the shared API client rather than duplicating HTTP request handling.

## Backend

- `server.py` currently contains the Flask application, SQLite connection and schema initialization, static frontend serving, and API routes for the reader, statistics, presence, authentication, Matrix linking, users, profile, communities, and posts.
- The backend is currently a monolith. Splitting it into blueprints and isolated database/migration modules is a future refactor, not yet completed.
- Database schema changes must be reviewed carefully. Do not drop or rewrite production tables as part of a cosmetic or structural refactor. Use explicit, backed-up, versioned migrations.

## Build and deployment

- Root `package.json` defines Vite development and build scripts.
- `vite.config.js` configures the frontend build.
- `.github/workflows/ci.yml` builds the frontend, uploads the build and `server.py` to the PythonAnywhere app, reloads the web app, then runs production visual checks.
- `.github/workflows/publish-android.yml` handles Android packaging/release.
- A successful build is not sufficient by itself: confirm the deployment step and production checks before treating a website update as live.

## Safe refactoring rules

1. Preserve the current UI and API behavior unless a change is explicitly requested.
2. Before moving a module, inspect all imports and dynamic references.
3. Do not delete legacy files solely because they are not imported by the current app entry; the old root route and tools may still reference them.
4. Keep database migrations separate from normal application startup.
5. Refactor in small commits, run the build and available tests after each step, and verify the deployed site and Android package separately.
6. Remove obsolete scripts from `package.json` only after confirming they are not used by CI, local workflows, or developer instructions.

## Known audit findings (2026-11-20)

- `server.py` is approximately 1,980 lines and mixes multiple domains.
- The reader, messages, and profile CSS files are large and need selector/dependency mapping before splitting.
- `package.json` references `tools/analyze_frames.py` and `tests/avatar/verify_frames.py`; those exact paths were not present in the inspected repository tree. Verify whether the scripts were retired or moved before changing the scripts.
- The repository contains root-level legacy frontend files alongside the current `frontend/` application. Their usage needs to be traced before cleanup.
- The current visual test is `tests/visual/screenshot.mjs`; no separate unit-test suite was found in the inspected tree.

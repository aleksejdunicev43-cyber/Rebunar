# Black Label integration audit

Date: 2026-11-12

## Decision: do not replace the current application with the ZIP snapshot

The supplied archive contains a mixed snapshot:
- the modular Rebunar frontend under `frontend/`;
- a Flask backend in `server.py`;
- a separate `webtoon/` backend package with four SQLite migrations;
- `preview/rebunar-black-label.html`, a standalone visual prototype.

The ZIP's frontend is older than the current `main` branch. The current GitHub application already has routes and modules for Rebunar Studio, the ecosystem/store, creator areas, profile, chats, communities, and other screens. Replacing `frontend/app/app.js`, `frontend/layout/shell.js`, or the root `server.py` with the ZIP copies would discard newer work.

## Findings

1. The archive's `preview/rebunar-black-label.html` is a demo, not the production Webtoon UI. Its data layer persists to browser `localStorage`; it does not call the Rebunar API and does not share the authenticated account/session or server database.
2. The `webtoon/` Python package is a server-side foundation. It registers a Flask blueprint at `/api/webtoon/*`, currently exposing `GET /ping` and `GET /genres`.
3. The four SQL migrations create separate `wt_*` tables and reference the existing `users(id)` table. They do not replace the existing Rebunar account, chat, or community tables.
4. A migration smoke test against a temporary SQLite database with a compatible `users` table applied migrations 001–004 successfully and reported no foreign-key violations.
5. The archive's `server.py` registers the Webtoon blueprint with the existing Flask app and database path. That integration point is suitable in principle, but the current GitHub server must be patched rather than replaced.

## Safe integration plan

- Keep the current `main` application shell, authentication, profiles, chats, communities, Studio, and ecosystem modules.
- Port only the Webtoon backend package and migrations, then register its blueprint against the current Rebunar database.
- Keep automatic migrations disabled by default; take a database backup and apply migrations explicitly after deployment.
- Build a real Webtoon frontend module that uses the authenticated Rebunar API/session. Do not ship the standalone localStorage demo as if it were connected.
- Add navigation and route integration without replacing existing screens.
- Run frontend build, backend smoke tests, migration checks, and APK build before merging to `main`.


## Work staged on the integration branch

The first safe backend slice is now committed on `feature/black-label-webtoon-foundation` and proposed in draft PR #89:
- The existing Flask server registers the Webtoon blueprint against the same `DB` path used by Rebunar.
- The four additive migrations and a CLI (`python -m webtoon.migrate status|up`) are included.
- Migrations remain manual and create a backup before applying changes.
- CI now runs the frontend production build and Webtoon migration smoke tests.

GitHub Actions run 476 completed successfully: frontend build and migration tests passed. Deployment and APK packaging were intentionally skipped because this is a pull request and no production frontend integration has been completed.

## Not yet done

No production code from the ZIP has been merged into the app yet. No live database migrations have been run. No APK has been rebuilt. This report records the compatibility findings before implementation.

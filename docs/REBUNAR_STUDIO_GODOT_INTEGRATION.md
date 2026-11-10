# Rebunar Studio — Godot Editor integration plan

Status: isolated integration prototype / CI validation. The branch now contains an experimental single-APK module conversion and native launch bridge; it is not yet a verified working APK.

## Goal

Deliver one Rebunar Android application with a full game editor based on the open-source Godot Editor. Users should enter through Rebunar Studio, work with scenes, nodes, assets, animation, scripts and run/debug projects without installing the official Godot app separately.

## Current Rebunar Android architecture

- The Android app is a Kotlin Activity hosting a WebView.
- The WebView serves the frontend bundled into the APK for the `/new` route.
- Authentication, API, chat and database traffic continue to use the Rebunar HTTPS backend.
- The Android app is currently WebView-only (the earlier Godot runtime prototype was removed in v0.1.6).
- The Android release workflow builds the frontend, checks out `feature/android-bundled-frontend`, copies the Android shell, bundles frontend assets and assembles the APK.

## Audit of the existing Rebunar Android shell (2026-11-08)

The Android source branch `feature/android-bundled-frontend` was inspected directly:

- `settings.gradle.kts` currently includes only `:app`.
- Root Android Gradle plugins are Android Gradle Plugin 8.7.3 and Kotlin 2.0.21.
- `:app` is a standard Android application module (namespace/applicationId `ru.rebunar.app`), compile/target SDK 35, min SDK 24, Java 17.
- `MainActivity` is a native `Activity` hosting a WebView. It intercepts only bundled `/new/**` frontend assets while API calls continue over HTTPS.
- The current app has no Godot dependency or native Godot Activity after the v0.1.6 rollback.

### Consequence for one-APK integration

The upstream Godot `:editor` module is an Android *application* module with its own application ID, launcher alias, manifest, resources, and dependency on Godot's `:lib` module. It cannot simply be added as `implementation(project(":editor"))` to Rebunar's application module. The editor module must be adapted into an embeddable Android library/feature (or its source and resources merged carefully), while retaining the native editor entry Activity and Godot's editor-specific assets/data paths. The Godot native `:lib` editor variant must be built with the matching tools libraries and ABI.

The least risky next experiment is to produce a single debug APK from a dedicated integration branch by:
1. adding the upstream Android Gradle project as a controlled included build/subproject;
2. converting the editor packaging module into a library-compatible module, resolving application-only Gradle settings and manifest placeholders;
3. adding an explicit Rebunar native Activity entry point that launches the editor Activity;
4. resolving resource/manifest collisions and checking editor project storage permissions;
5. verifying the APK contains the editor native library and launches without a second installed package.

This is an engineering prototype, not a production merge. Keep the WebView as the primary Rebunar shell and do not change the release workflow until the prototype passes device tests.

## Technical findings

- Initial upstream baseline: Godot **4.7.2-stable** (official latest stable release verified on 2026-11-08). Keep this version pinned until a deliberate upgrade is reviewed.
- A first CI workflow now builds the official Android Editor from that pinned source, changes its Android package label to Rebunar Studio, and uploads a preview APK. This standalone build is an intermediate validation artifact, not yet the final one-APK integration.
- The upstream Android editor application module is `platform/android/java/editor`; it depends on the native Android library module `:lib` and the shared `:app` Gradle configuration. It is not the same thing as the `godot-lib` runtime AAR.

1. Godot's Android Editor is a native editor build, not the Godot Android runtime library. Official build instructions use SCons with `platform=android target=editor` for each architecture.
2. The Android Editor is a large native application with project/file access, import pipeline, editor UI, rendering and export tooling. Copying files from its APK into Rebunar would not integrate these systems.
3. The clean first engineering milestone is to build and run a branded standalone editor variant from Godot source in CI. This validates source version, Android toolchain, ABI support and packaging before attempting same-process integration.
4. The second milestone is to package the editor as an Android library/module and launch it from the Rebunar shell. If upstream Android editor packaging cannot safely run inside the current Activity/process, use a dedicated Android process or an internal editor Activity while keeping a single installed APK.
5. The final milestone is to connect project storage and the Rebunar Studio entry point, then customize visible branding and Russian localization.

## Device constraints

The official Godot documentation lists 3 GB RAM as the minimum for the native mobile editor and 6 GB as recommended for a smooth simple 2D/3D workflow. The editor's listed storage baseline is 200 MB, while export templates and caches add substantial storage (up to around 1.5 GB depending on targets). The target phone has 4 GB RAM, so it is near the minimum: a lightweight 2D-first profile may work, but performance and stability are not guaranteed. We must measure on the actual device before promising a usable experience.

## Phased implementation

### Phase 1 — Source and build audit
- Pin an upstream Godot release/commit.
- Audit the Android editor Gradle project, manifest, application ID, storage permissions, editor data paths and localization resources.
- Determine whether the Android editor can be included as a module in the existing app or needs a separate process/Activity.
- Keep all work isolated on this feature branch.

### Phase 2 — Reproducible CI build
- Add a separate workflow that checks out the pinned upstream source and builds the Android editor for ARM64 and ARMv7 where supported.
- Cache build dependencies/artifacts; do not put the entire Godot source tree into the Rebunar APK assets.
- Publish a preview artifact only after the APK passes archive/ABI/package checks.

### Phase 3 — Rebunar identity and Russian UI
- Change package/application labels and launcher artwork to Rebunar Studio.
- Keep required Godot MIT copyright/license notices and third-party notices.
- Use the upstream Russian translation first; then adjust terminology and add Rebunar-specific labels.
- Do not remove upstream attribution or imply official Godot affiliation.

### Phase 4 — One-app integration
- Embed/merge the editor Android module into the Rebunar app package.
- Add a native bridge from the Studio dashboard to the editor Activity.
- Define a project folder and safe handoff format between WebView Studio and native editor.
- Verify returning to Rebunar, lifecycle handling, orientation, file picker and project persistence.

### Phase 5 — Phone usability and validation
- Start with 2D workflow and compatibility renderer.
- Test scene tree, inspector, file system, script editing, touch input, import and project run.
- Measure APK size, first-launch time, RAM use and storage use on the target phone.
- Only then decide which editor panels need a Rebunar-specific mobile layout.

## Acceptance criteria

- One installed Rebunar APK; no separate Godot app required.
- Studio opens the native editor and returns to Rebunar reliably.
- Create, save, reopen and run a simple 2D project.
- Russian UI and Rebunar branding are visible without deleting required license notices.
- Both ARM ABI targets are packaged only if the build and device compatibility checks pass.
- Existing Rebunar WebView, login, chats and backend routes continue to work.

## Official references

- Android Editor: https://docs.godotengine.org/en/latest/tutorials/editor/using_the_android_editor.html
- Android source build: https://docs.godotengine.org/en/latest/engine_details/development/compiling/compiling_for_android.html
- Godot source: https://github.com/godotengine/godot
- License: https://github.com/godotengine/godot/blob/master/COPYRIGHT.txt

## Follow-up audit — successful native editor build and embedding design (2026-11-08)

- The first reproducible CI build completed successfully. It produced `android_editor-android-debug.apk` (about 172 MiB) with `lib/arm64-v8a/libgodot_android.so`. This is a standalone preview artifact only; it is not the Rebunar release APK and must not be presented as the final user download.
- The editor entry activity is implemented in the Android source set at `editor/src/android/java/org/godotengine/editor/GodotEditor.kt`; its base class is `BaseGodotEditor`. The activity can be retained as an internal, non-exported activity when the editor module is embedded.
- The editor module has Android distribution flavors (`android`, `horizonos`, `picoos`) and depends on the Godot `:lib` module's `editor` product flavor. Rebunar's app will need explicit flavor-dimension selection and the editor library must preserve its own namespace so its generated `R` and `BuildConfig` references remain valid.
- The upstream editor Gradle module currently uses `com.android.application`, app-only application ID/version/signing settings and a launcher activity alias. The integration experiment will convert only this packaging module to `com.android.library`, remove app-only configuration and the launcher alias, and merge its internal activities, permissions, resources and assets into Rebunar's existing `:app`.
- The Rebunar app manifest remains authoritative for the installed app label, icon, launch activity and application theme. The editor activity will be started from a native bridge in Rebunar's existing MainActivity/WebView shell.
- Godot already ships a Russian editor translation at `editor/translations/editor/ru.po`; this gives us a real localization baseline rather than translating every editor term from scratch. We will retain the upstream translation and then review Rebunar-specific labels.
- The standalone build is ARM64 only at this point. ARMv7 packaging and 4 GB RAM device behavior remain separate validation tasks.


## Integration build architecture update (2026-11-08)

The first draft attempted to make Godot's editor project a library while relocating its Gradle root under the Rebunar Android shell. That approach replaced upstream Gradle configuration and risked losing Godot's version catalog, native-library paths and SCons task setup. It has been superseded.

The integration workflow now keeps `godot-src/platform/android/java` as the Gradle root and includes the existing Rebunar `:app` as an additional project named `:rebunarApp`. This preserves the pinned upstream Godot SDK/plugin configuration and its expected native library layout.

The editor packaging module is converted from an installable application to an Android library for this experiment:
- remove application ID, app version/signing configuration and app-only build type settings;
- retain the editor namespace, Android distribution flavor and dependency on Godot's `:lib` editor product;
- remove the separate launcher alias and app-level icon/label/theme/backup attributes from the library manifest;
- merge the editor activities and permissions into the Rebunar application manifest.

The Rebunar app is configured to select Godot's `android` distribution and `editor` product flavors, then adds `:editor` as an implementation dependency. Its existing WebView remains the main app surface. A native URL bridge for `rebunar://studio/editor` launches the internal Godot editor Activity.

The integrated CI workflow now also builds the Vite frontend and copies `frontend/build` into the Android APK assets before packaging. It verifies the Rebunar package ID, bundled frontend entry point, Godot ARM64 native library and merged Godot editor Activity. The output remains a debug preview artifact and must pass real-device checks before being treated as a usable release.

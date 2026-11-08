# Rebunar Studio — Godot Editor integration plan

Status: investigation / architecture phase. This document does not claim that the Godot editor has already been embedded.

## Goal

Deliver one Rebunar Android application with a full game editor based on the open-source Godot Editor. Users should enter through Rebunar Studio, work with scenes, nodes, assets, animation, scripts and run/debug projects without installing the official Godot app separately.

## Current Rebunar Android architecture

- The Android app is a Kotlin Activity hosting a WebView.
- The WebView serves the frontend bundled into the APK for the `/new` route.
- Authentication, API, chat and database traffic continue to use the Rebunar HTTPS backend.
- The Android app is currently WebView-only (the earlier Godot runtime prototype was removed in v0.1.6).
- The Android release workflow builds the frontend, checks out `feature/android-bundled-frontend`, copies the Android shell, bundles frontend assets and assembles the APK.

## Technical findings

1. Godot's Android Editor is a native editor build, not the Godot Android runtime library. Official build instructions use SCons with `platform=android target=editor` for each architecture.
2. The Android Editor is a large native application with project/file access, import pipeline, editor UI, rendering and export tooling. Copying files from its APK into Rebunar would not integrate these systems.
3. The clean first engineering milestone is to build and run a branded standalone editor variant from Godot source in CI. This validates source version, Android toolchain, ABI support and packaging before attempting same-process integration.
4. The second milestone is to package the editor as an Android library/module and launch it from the Rebunar shell. If upstream Android editor packaging cannot safely run inside the current Activity/process, use a dedicated Android process or an internal editor Activity while keeping a single installed APK.
5. The final milestone is to connect project storage and the Rebunar Studio entry point, then customize visible branding and Russian localization.

## Device constraints

The official Godot documentation lists 3 GB RAM as the minimum for the native mobile editor and 6 GB as recommended for a smooth simple 2D/3D workflow. Storage requirements are also materially larger than the current Rebunar shell because editor caches and export templates are additional. We must test on the target phone and provide a lightweight 2D-first profile; performance on 4 GB devices is not guaranteed.

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

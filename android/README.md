# Rebunar Mesh Lab (Android prototype)

This is a separate, experimental Android app. It does not modify the Rebunar web app or its chat backend.

## Current prototype scope

- Opt-in BLE advertising and scanning.
- Devices identify the prototype by a public service UUID only.
- The app displays a count of nearby Rebunar Mesh Lab devices.
- It does not connect to devices and does not send or receive messages.
- It does not access contacts, photos, files, Signal, or Rebunar account data.
- It does not run a background service.

This is deliberately a discovery-only first test. It is not yet a mesh network or messenger.

## Build

Open the `android/` directory in Android Studio, allow Gradle sync, then run the `app` configuration on a physical Android phone. BLE discovery generally cannot be meaningfully tested in an emulator.

The project uses Android Gradle Plugin 8.7.3, Gradle 8.9, JDK 17, compile SDK 35 and minimum SDK 23.

## Test with two phones

1. Install and open the same debug build on both phones.
2. Enable Bluetooth on both.
3. On Android 11 and older, grant Location permission when requested and enable the system Location switch; Android requires this for BLE scanning even though this prototype does not read location.
4. Tap **Включить обнаружение** on both phones.
5. Keep both apps open and within BLE range. Each should eventually show at least one nearby device.
6. Tap **Выключить обнаружение** to stop both advertising and scanning.

A count of zero does not prove the phone is incompatible: Android/OEM power policies, BLE support, permissions, radio conditions and scan timing can affect discovery.

## Privacy notes

The service UUID is shared by every test installation, so it identifies the app protocol, not a user. The OS Bluetooth address is read locally only to avoid counting the same nearby device repeatedly during one run; it is not displayed, saved, or transmitted by app code. The app does not put usernames, account IDs or message content in BLE advertisements.

Do not use this prototype for sensitive communication. It has no message transport or end-to-end encryption yet.

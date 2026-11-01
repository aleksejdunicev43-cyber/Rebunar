# Rebunar Mesh Lab — first device test

## Purpose

Verify that two physical Android phones can advertise and discover the same BLE service while the app is open. This is only a radio/discovery test, not a message-delivery test.

## Test matrix

| Test | Expected result |
|---|---|
| Both phones have Bluetooth on and app open | Each detects the other after a short scan period |
| One phone stops Mesh | It stops advertising and scanning |
| Bluetooth disabled | App reports that Bluetooth must be enabled |
| Permission denied | Discovery does not start; user can grant permission in Android settings |
| App closed | Discovery stops; background operation is not implemented |
| Phone has no BLE advertiser support | App reports that advertising is unsupported |

## Important Android 11 detail

Android 11 and older require runtime Location permission and the system Location toggle for BLE scanning. The prototype does not request or read GPS coordinates. This is an Android platform permission requirement for BLE discovery on those versions.

## What this test does not prove

- No chat message is transmitted.
- No store-carry-forward relay is implemented.
- No long-distance delivery is possible.
- No group chat support is implemented.
- No battery/background reliability claim has been tested.
- No cryptographic protocol has been integrated.

## Gate before message transport

Do not add user messages until a separate protocol review defines end-to-end encryption, recipient authentication, replay protection, relay limits, expiry, queue limits, abuse controls and key recovery.

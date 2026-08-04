# Pets SuperApp — Mobile (Flutter)

Persian (RTL) Flutter client for the pet marketplace. Stack per spec:
**Flutter + Riverpod + go_router + Dio + SharedPreferences + flutter_secure_storage
+ firebase_messaging + image_picker + cached_network_image + intl**.

## Status

Phase-1 app source (`lib/`) is complete: OTP auth with refresh rotation, RTL home with
banners/categories/featured, product search + detail, cart with quantity control, orders
list with **10-second polling** (no WebSocket), profile shell.

The platform folders (`android/`, `ios/`) are **generated**, not committed — create them
once on a dev machine with the Flutter SDK (see below). This is also how the project stays
in sync with future Flutter upgrades.

## Getting started (dev machine with Flutter ≥ 3.27)

```bash
cd mobile
flutter create . --org ir.petshop --project-name pets_app   # generates android/ ios/ …
flutter pub get

# Firebase (push notifications): add your configs
#   android/app/google-services.json
#   ios/Runner/GoogleService-Info.plist
# then run the flutterfire CLI if you want firebase_options.dart:
#   flutterfire configure

# Run against the local API (Android emulator → host loopback is 10.0.2.2)
flutter run --dart-define=API_URL=http://10.0.2.2:3000

# Or a real device on the same network
flutter run --dart-define=API_URL=http://192.168.1.x:3000

# Production
flutter build apk --dart-define=API_URL=https://api.petshop.ir
```

> If `flutter pub get` reports an intl version conflict with `flutter_localizations`,
> match the SDK-pinned version (e.g. `intl: ^0.20.2` on Flutter 3.27+).

For push tokens, after login the app should register the FCM token via
`POST /api/v1/notifications/device-token` (service wiring is included; enable once
Firebase configs are added).

## Conventions

- API base URL comes from `--dart-define=API_URL=…` (`lib/src/config.dart`).
- Tokens live in `flutter_secure_storage` (encrypted), never in plain SharedPreferences.
- Refresh-token rotation mirrors the backend flow (`AuthNotifier.refresh` + Dio interceptor).
- All amounts render as تومان with Persian digits (`lib/src/shared/utils/persian.dart`).
- Polling interval is centralized: `AppConfig.pollingInterval` (10s per spec).

# Mobile Connect Troubleshooting Reference

This reference captures the concrete `mobile-connect` issues already encountered in this repository.

## Known failure sequence

1. The app opened from a deeplink but showed no visible UI.
2. On-device screenshot confirmed the screen was blank, not just waiting for device selection.
3. Logcat then showed `Unable to load script`, meaning the physical device could not reach Metro.
4. After `adb reverse`, Metro served the bundle, but the app failed because `react-native-gesture-handler` was imported without being installed.
5. After adding the package, the app still failed until the Android debug app was rebuilt and reinstalled, because the native module was not yet present in the binary.
6. Once the app reached React render, `StyleProvider` crashed because `@ledgerhq/lumen-ui-rnative` was undefined at runtime in this app setup.
7. Replacing the rendered mobile UI with plain React Native components allowed the connect flow to render reliably.

## Error signatures to recognize

### Metro not reachable

Logcat contains:

```text
Unable to load script.
The packager does not seem to be running
Failed to connect to localhost/127.0.0.1:8081
```

Fix:

```bash
adb reverse tcp:8081 tcp:8081
```

### JS dependency missing

Metro or the red screen contains:

```text
Unable to resolve module react-native-gesture-handler
```

Fix:

```bash
pnpm add react-native-gesture-handler --filter mobile-connect
```

Also keep `GestureHandlerRootView` at the app root.

### Native module missing from installed app

Red screen contains:

```text
TurboModuleRegistry.getEnforcing(...): 'RNGestureHandlerModule' could not be found
```

Fix:

```bash
cd apps/mobile-connect/android
./gradlew app:installDebug
```

### Lumen runtime crash

Red screen contains:

```text
Cannot read property 'ThemeProvider' of undefined
```

Fix:

- Do not rely on `@ledgerhq/lumen-ui-rnative` for the runtime render path in `mobile-connect` until it is intentionally reintegrated and validated.
- Keep `StyleProvider` as a passthrough or use plain React Native components for the current app shell.

## Recommended debugging commands

Start Metro:

```bash
pnpm --filter mobile-connect start
```

Cold-start deeplink:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.mobileconnect
adb shell am start -W -a android.intent.action.VIEW -d "ledger-connect://connect" com.mobileconnect
```

Capture diagnostics:

```bash
adb logcat -d > /tmp/mobile-connect-logcat.txt
adb exec-out screencap -p > /tmp/mobile-connect-screen.png
```

Reinstall native Android app:

```bash
cd apps/mobile-connect/android
./gradlew app:installDebug
```

Typecheck after code edits:

```bash
pnpm --filter mobile-connect typecheck
```

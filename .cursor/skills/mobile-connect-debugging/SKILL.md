---
name: mobile-connect-debugging
description: Debug blank screens, deeplink failures, Metro connectivity, and Android runtime issues in `apps/mobile-connect`. Use when `mobile-connect` opens without UI, deep links do not reach the expected screen, a physical Android device cannot load the JS bundle, or native React Native modules were added and the app must be rebuilt.
---

# Mobile Connect Debugging

Use this skill for `apps/mobile-connect` when the app launches but shows a blank screen, a red error screen, or deeplinks do not reach the expected flow.

## Quick workflow

1. Start Metro for `mobile-connect`.

```bash
pnpm --filter mobile-connect start
```

2. If using a physical Android device, expose Metro over USB before relaunching the app.

```bash
adb reverse tcp:8081 tcp:8081
adb reverse --list
```

3. Relaunch with a cold start when diagnosing deeplinks.

```bash
adb shell am force-stop com.mobileconnect
adb shell am start -W -a android.intent.action.VIEW -d "ledger-connect://connect" com.mobileconnect
```

4. Capture logs and a screenshot immediately after launch.

```bash
adb logcat -d > /tmp/mobile-connect-logcat.txt
adb exec-out screencap -p > /tmp/mobile-connect-screen.png
```

## Interpret common failures

### Blank or red screen with `Unable to load script`

- Metro is not reachable from the device.
- Ensure Metro is running.
- Re-run `adb reverse tcp:8081 tcp:8081`.
- Relaunch the app after re-establishing the reverse tunnel.

### `Unable to resolve module react-native-gesture-handler`

- The dependency is missing from `apps/mobile-connect/package.json`.
- Add it with `pnpm add react-native-gesture-handler --filter mobile-connect`.
- `App.tsx` should wrap the tree with `GestureHandlerRootView`.

### `RNGestureHandlerModule could not be found`

- JS now references the package, but the Android app binary was not rebuilt after adding the native dependency.
- Reinstall the debug app:

```bash
cd apps/mobile-connect/android
./gradlew app:installDebug
```

### Deep link works only on cold start

- During diagnosis, assume warm-start delivery can be unreliable if React context is not ready yet.
- Prefer `force-stop` + relaunch before concluding the route config is wrong.

## Repo-specific guidance

- Keep `apps/mobile-connect/metro.config.js` conservative. Avoid aggressive custom `resolverMainFields`, `unstable_conditionNames`, or other export-resolution overrides unless there is a proven need.
- The current reliable UI path for `mobile-connect` is plain React Native components.
- `@ledgerhq/lumen-ui-rnative` is present in dependencies, but its runtime integration currently crashes in this app setup. Treat Lumen re-enablement as a separate task, not an incidental fix while debugging deeplinks.

## Validate after changes

Run:

```bash
pnpm --filter mobile-connect typecheck
```

Then relaunch with:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.mobileconnect
adb shell am start -W -a android.intent.action.VIEW -d "ledger-connect://connect" com.mobileconnect
```

## Additional reference

- For a fuller troubleshooting checklist and the specific failure signatures seen in this repo, see [reference.md](reference.md).

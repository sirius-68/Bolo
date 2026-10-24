# Faster builds and instant updates

## What happens on each push to `main`

| Step | Time | What you get |
|---|---|---|
| Typecheck & bundle | ~3 min | Fails fast on code errors |
| Quick APK (arm64 only) | ~10–12 min | `latest-build` pre-release, works on all modern phones |

The full build (all CPU types) and the emulator tour only run when you start the **Android** workflow by hand (Actions → Android → Run workflow, tick *release* for a release page).

## Instant updates (paused)

Over-the-air updates (EAS Update) were tried in build 28–31: adding `expo-updates` made the Android build hang in `compileReleaseKotlin`, so it was removed. To retry later: create the Expo project, add `expo-updates` with `npx expo install expo-updates`, run `eas update:configure`, and test a build before relying on it.

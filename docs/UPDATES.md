# Faster builds and instant updates

## What happens on each push to `main`

| Step | Time | What you get |
|---|---|---|
| Typecheck & bundle | ~3 min | Fails fast on code errors |
| Instant update (EAS Update, once set up) | ~2 min | Installed apps download the new screens next time they open — no reinstall |
| Quick APK (arm64 only) | ~10–12 min | `latest-build` pre-release, works on all modern phones |

The full build (all CPU types) and the emulator tour only run when you start the **Android** workflow by hand (Actions → Android → Run workflow, tick *release* for a release page).

## Turning on instant updates (once)

1. Make a free account at https://expo.dev and create a project named **bolo** (slug `bolo`).
2. Copy its **Project ID** (looks like `1a2b3c4d-…`). It is not secret.
3. GitHub → this repo → Settings → Secrets and variables → Actions:
   - **Variables** tab → New variable `EAS_PROJECT_ID` = the Project ID.
   - **Secrets** tab → New secret `EXPO_TOKEN` = a token from expo.dev → Account settings → Access tokens. Keep it private; don't paste it in chat.
4. Install one new APK built after step 3 (the app needs to know where to look for updates). From then on, pushes that only change app code arrive as updates; changes to native parts (new libraries) still need a new APK.

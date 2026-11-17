# bolo

Jobs, talent and careers near you: an Android app. Powered by igne-industries.

bolo has two kinds of profile on one account:

| | Regular profile | Business page |
|---|---|---|
| Who | You, as a person | A company you run or recruit for |
| Find work | Send offers on jobs, apply to vacancies, internships and programs | — |
| Hire | Personal jobs (a plumber, a tutor, a driver) with live job tracking | Vacancies with an applicant pipeline, company contracts (verified businesses), team |
| Career | CV builder, courses, mentors, career experts | Create internships and programs, list courses |
| Talk | Chat with typing, delivered and seen marks; voice and video calls that ring on the lock screen | The same, as the business |

A person can switch between their Regular profile and any of their business pages from the profile chip at the top of each tab. A **business-only account** (created from “Create a business account”) has no Regular profile.

Everything in the app comes from real accounts on the server: there is no sample data and no demo mode. People pay each other directly; bolo takes no payments.

## Tech

- [Expo SDK 54](https://docs.expo.dev) · React Native 0.81 (New Architecture, Hermes) · React 19
- expo-router (file-based navigation: `app/`), a custom floating tab bar and a single bottom-sheet host
- Supabase: Postgres with row-level security, realtime, storage and edge functions (`supabase/`)
- The app keeps a copy of the account's data on the phone (`src/data/db.ts`, saved with AsyncStorage) so it opens at once and works on a weak connection; `src/logic/server.ts` loads and keeps it live
- Calls with Agora; push through Firebase Cloud Messaging; maps with Mapbox

```
app/                 screens (expo-router)
  (tabs)/            Home (map / business dashboard), Feed, Career, Me
src/data/            the data model and reference lists (categories, countries)
src/logic/           what the app does, without UI: server, chats, calls, jobs, career, push
src/sheets/          bottom sheets (jobs, chat, comments, career, business, account, filters)
src/components/      cards, nav bar, CV, reviews, shared forms
src/ui/              colours, primitives (kit), icons, sheet/picker/toast overlays
plugins/             build plugins: one APK per CPU type, and the native code that rings for calls
supabase/            migrations, database tests, edge functions
admin/               the web admin panel (published with GitHub Pages)
scripts/             end-to-end test against staging, admin tools
.maestro/            emulator tours for both account types, the update test and the ringing test
docs/                how the backend is set up and deployed
```

## Builds

GitHub Actions does the building and testing:

- **Typecheck**: on every push.
- **Android**: on `main`, a test build against the staging server. Started by hand it also runs the emulator tours; with *release* ticked it builds against production and publishes a versioned release.
- **Backend**: database tests on a throwaway Supabase, then staging, then (by hand, with approval) production.
- **Admin panel**: publishes `admin/` when it changes.
- **iOS**: by hand only. An unsigned simulator build; a phone build needs an Apple Developer account.

### Install the APK

1. Open the latest release on your Android phone and download `bolo.apk` (use `bolo-universal.apk` only if the first one says “App not installed”).
2. Open it. If Android asks, allow *Install unknown apps* for your browser.

## Run it locally

```bash
npm install
npx expo prebuild --platform android
npx expo run:android     # needs the Android SDK; Expo Go cannot run bolo (calls, maps and push are native)
```

See `docs/BACKEND.md` for the server side.

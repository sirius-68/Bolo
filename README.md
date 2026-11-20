# getit

Find a good worker in seconds, or get work near you. An Android app; an iPhone version is planned for the
same launch. Powered by igne-industries.

- **Hiring:** tap the big button and say what you need. getit shows good workers near you. Call or message
  one, or ask several for a price and pick an offer. Follow the job from booked to done, pay the worker
  directly, and rate how it went.
- **Working:** join with your main skill and how you work. Go available with one tap. Jobs that fit you come
  to your phone; send your price, do the job, get paid directly. getit takes nothing for now.

Looking needs no account. Your number (or email) is asked only when you contact someone, with a code and no
password. Others only ever see your area, never your address.

How the app is organised, what is built and what is next: [docs/GETIT.md](docs/GETIT.md).

## Tech

- [Expo SDK 54](https://docs.expo.dev) · React Native 0.81 (New Architecture, Hermes) · React 19
- expo-router (file-based navigation: `app/`), a floating tab bar and one bottom-sheet host; dark and light
- Supabase: Postgres with row-level security, realtime, storage and edge functions (`supabase/`)
- The app keeps a copy of the account's data on the phone (`src/data/db.ts`, saved with AsyncStorage) so it opens at once and works on a weak connection; `src/logic/server.ts` loads and keeps it live
- Calls with Agora; push through Firebase Cloud Messaging; maps with Mapbox; speech with the phone's own recogniser; an edge function reads a need with AI when the word list can't

```
app/                 screens (expo-router): splash, intro, the two journeys; (tabs)/ has Find, Jobs, Inbox
src/g/               the look and the building blocks: theme, buttons, sheets, icons, sign-in, the status screen
src/logic/           what the app does, without UI: server, chats, calls, requests, bookings, push
src/data/            the data model and reference lists (trades, countries)
plugins/             build plugins: one APK per CPU type, and the native code that rings for calls
supabase/            migrations, database tests, edge functions
admin/               the web admin panel (published with GitHub Pages)
scripts/             end-to-end test against the test server, admin tools
.maestro/            emulator tours: looking around, a worker joining, someone hiring, one whole job
docs/                how the app and the server are set up
```

## Builds

GitHub Actions does the building and testing:

- **Typecheck**: on every push.
- **Android**: on `main`, a test build against the staging server. Started by hand it also runs the emulator tours; with *release* ticked it builds against production and publishes a versioned release.
- **Backend**: database tests on a throwaway Supabase, then staging, then (by hand, with approval) production.
- **Admin panel**: publishes `admin/` when it changes.
- **iOS**: by hand only. An unsigned simulator build; a phone build needs an Apple Developer account.

### Install the APK

1. Open the latest release on your Android phone and download the `.apk` (use the `universal` one only if the first says “App not installed”).
2. Open it. If Android asks, allow *Install unknown apps* for your browser.

## Run it locally

```bash
npm install
npx expo prebuild --platform android
npx expo run:android     # needs the Android SDK; Expo Go cannot run getit (calls, maps and push are native)
```

See `docs/BACKEND.md` for the server side.

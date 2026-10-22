# bolo

Jobs, talent and careers near you — a native Android and iOS app for Cameroon (built in Buea).

bolo has two kinds of profile on one account:

| | Regular profile | Business page |
|---|---|---|
| Who | You, as a person | A company you run or recruit for |
| Find work | Send offers on jobs, apply to vacancies, internships and programs | — |
| Hire | Personal jobs (a plumber, a tutor, a driver) with live job tracking | Vacancies with an applicant pipeline, company contracts (verified businesses), team |
| Career | CV builder, courses, mentors, career experts | Create internships, programs and courses; enrol employees |
| Grow | bolo Pro | Business Pro, Ads manager |

A person can switch between their Regular profile and any of their business pages from the profile chip at the top of each tab. A **business-only account** (created from “Create a business account”) has no Regular profile.

## Tech

- [Expo SDK 54](https://docs.expo.dev) · React Native 0.81 (New Architecture, Hermes) · React 19
- expo-router (file-based navigation: `app/`), a custom floating tab bar and a single bottom-sheet host
- Local-first data model (`src/data/db.ts`) persisted with AsyncStorage; all business logic lives in `src/logic/*` and is UI-free
- Phosphor icons rendered with react-native-svg, Plus Jakarta Sans

```
app/                 screens (expo-router)
  (tabs)/            Home (map / business dashboard), Feed, Career, Me
src/data/            seed data, catalog, image registry
src/logic/           accounts, jobs & bookings, career, chat, persistence, live timers
src/sheets/          bottom sheets (jobs, chat, career, business, account, profile, filters, create)
src/components/      cards, nav bar, CV, skills editor, shared headers
src/ui/              design tokens, primitives (kit), icons, sheet/picker/toast overlays
.maestro/            emulator UI tours for both account types
```

### Performance notes

- Lists use `FlatList` / `SectionList` with windowing; the chat is an inverted list.
- Screens re-render only while focused (`useLive`); background timers skip renders when nothing changed.
- Images go through `expo-image` (memory + disk cache); release builds are minified with R8 and resources are shrunk.
- Android ships `arm64-v8a`, `armeabi-v7a` and `x86_64` in one APK.

## Run it

```bash
npm install
npx expo start          # scan with Expo Go, or press a / i
```

## Builds

Every push to `main` runs GitHub Actions:

- **Android** — type check, bundle, `assembleRelease`, then an emulator UI tour (Regular and Business). The APK is attached to the [`latest-build`](../../releases/tag/latest-build) pre-release. Run the workflow manually with *release* ticked to publish a versioned release.
- **iOS** — an unsigned simulator build (`bolo-ios-simulator.zip`). Installing on an iPhone needs an Apple Developer account and signing (`eas build -p ios`).

### Install the APK

1. Open the latest release on your Android phone and download `bolo-<n>.apk`.
2. Open it. If Android asks, allow *Install unknown apps* for your browser.
3. The APK is signed with the debug key, so uninstall it before installing a Play Store build later.

## Demo data

The app ships with sample people, jobs, companies, courses and chats around Buea so every screen has content. Payments (MTN MoMo / Orange Money), calls, verification and replies from other people are simulated on the device. Log out from Settings to reset.

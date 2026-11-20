# getit: how the app is built

getit finds a good worker near you in seconds. Two journeys: **hiring** (say what you need, see workers,
call, message, or ask several for a price, book, follow the job, rate) and **working** (join with your main
skill, go available, get jobs near you, send your price, do the job, get paid directly).

The look and the flows come from the design canvas ("getit app design"). The server (Supabase) is the one
the earlier app used; everything on the phone is new.

## Where things are

| Path | What |
|---|---|
| `app/` | One file per screen (Expo Router). `index` is the splash, `intro` the opening screen, `where` asks your area, `(tabs)` holds Find (or Work), Jobs and Inbox. |
| `src/g/theme.ts` | Colours in dark and light, the fonts, shadows. The look is chosen in the "you" sheet. |
| `src/g/ui.tsx`, `src/g/parts.tsx` | Building blocks: text, buttons, avatars, the big button, the bottom sheet, halos and pulsing rings, detail cards. |
| `src/g/icons.tsx`, `src/g/logo.ts` | Line icons and the logo as vectors (the canvas's own drawings). |
| `src/g/sheets.tsx` | The bottom sheets: get prices, book, after a call, rate, a problem, cancel, your price, your area, help, notifications, account, and the chat's menus. |
| `src/g/signin.tsx` | Sign in with a number or an email and a code, at the moment it is needed (`withAccount`). No passwords. |
| `src/g/data.ts`, `src/g/worker.ts` | Hiring or working mode, turning words into a trade, finding workers, money and dates as people say them, joining as a worker. |
| `src/g/notice.tsx` | Short messages (toast), the "are you sure?" question, the full-screen photo. |
| `src/g/Stories.tsx` | The status screen for updates ("What's new"). |
| `src/logic/`, `src/data/` | The data layer: sign-in, syncing the profile, requests and offers, bookings, chat, calls, notifications, location. Screens never talk to the server directly. |
| `supabase/` | Migrations, the edge functions (`understand` reads a need with AI, `push`, `send-sms`, `agora-token`, `delete-account`) and database tests. |

Screens use only `src/g` for their look, so every one works in dark and light.

## Screens (as in the canvas)

Hiring: intro → where → home (big button) → listening or typing → workers found → profile → call / chat →
get prices (sheet) → asking, with a live status line → offers → book (sheet) → your job (booked, on the way,
working, done) → rate (sheet) → thanks. Also: cancel (sheet) → cancelled, a problem (sheet).

Working: worker start → main skill → how you work → your number → you're on getit → prices, photos, ID
check, your profile → home (available or paused, jobs near you) → a job request → your price (sheet) →
offer sent → booked → the job step by step → job closed. A new job shows as an alert while the app is open.

## Decided rules the app follows (from the loopholes doc)

- Looking needs no account; the number is asked only at the moment of contact.
- Only the **area** is ever asked and shown (a neighbourhood or postcode). The exact place is sorted out by
  chat or call after booking, in every country.
- A request says **when** (as soon as possible, today, tomorrow, this week) and **where it happens** (my
  place, their shop, online). Urgency comes from "when".
- A search never ends on a timer. The status line always says what is happening and what you can do.
- Each new request goes to the workers who fit: closest first, at most 12, never everyone.
- Payment is direct, in cash or Mobile Money. getit takes nothing for now.

## Not built yet

- getit Pro: the agent (hiring) and the assistant (working). Designed in the canvas, planned for 1.1.
- Server rules from the loopholes doc: searching in widening rounds, "still need it?" check-ins and on hold,
  reliability scores, hidden two-way reviews, the free-try counter.
- Working hours, other skills and languages on the worker's profile; "Continue with Google".
- The app's hidden ID is still `cm.bolo.app`. A new ID needs a new `google-services.json` from Firebase
  (only the owner can create it); the app then installs as a separate app.
- The data layer still carries tables and fields the app no longer shows (business pages, courses). They are
  not read by any screen and can be dropped from the server once nothing depends on them.

## Checking a build

Start **Android** by hand on a branch: it builds the APK against the test server, publishes it to the
`latest-build` release, then runs four emulator tours and saves a picture of every screen (dark and light)
on the `ci-logs/qa-<run>` branch: `signedout` (looking around), `g1-work` (a worker joins), `g2-hire`
(someone finds them, chats, calls, asks for prices) and `g3-job` (one whole job, both sides, to the rating).
The tours make their accounts through `app/qa.tsx`, which only works in test builds.

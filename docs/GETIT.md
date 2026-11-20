# getit: rebuilding bolo to the new design

bolo is becoming **getit**. The backend and database stay; the app's screens are rebuilt to match the design
canvas ("getit app design"), and the sections the design doesn't have are hidden.

## How the rebuild is organised

| Path | What |
|---|---|
| `src/g/theme.ts` | getit's colours (dark and light), type helper, shadows. The look is chosen in the "you" sheet and remembered on the phone. |
| `src/g/ui.tsx` | Building blocks: text, the red button, round buttons, avatars, the big button with its rings, the bottom sheet. |
| `src/g/icons.tsx`, `src/g/logo.ts` | Line icons and the logo, as vectors (the same drawings as the canvas). |
| `src/g/data.ts` | Hiring or working mode, turning typed words into a trade, finding workers for it. |
| `src/g/TabBar.tsx`, `src/g/me.tsx` | The floating tab bar and the "you" sheet. |
| `src/g/signin.tsx` | The sign-in sheet: a number or an email, then a code. Opens at the moment of contact (`withAccount`). |
| `src/g/worker.ts` | Joining to offer a skill: the choices from the two steps, written to the profile once there is an account. |
| `src/g/speech.ts`, `app/listen.tsx` | Saying what you need. `supabase/functions/understand` reads it with AI when the word list can't. |
| `src/ui/*`, `src/components/*`, `src/sheets/*` | The screens and sheets from before the redesign. `src/ui/theme.ts` holds their colours under the old names, with getit's values, and follows dark and light (`paint()`), so they belong to the same app. Each is replaced by a `src/g` screen in turn. |
| `src/logic/*`, `src/data/*` | Unchanged: the data model, the server calls, chat, calls, bookings. New screens reuse them. |

A rebuilt screen uses only `src/g` for its look (so it works in dark and light) and `src/logic` for its data.

## Version 1 (the two main journeys)

Done:
- [x] Name, icon, splash, colours; red buttons everywhere
- [x] Opening screen (looking needs no account) and worker start screen
- [x] Tabs: Find (or Work), Jobs, Inbox, and the search button
- [x] Home: the big button (hiring), available or paused with jobs near you (working)
- [x] What do you need? → workers found, from real profiles (works signed out)
- [x] Jobs and Inbox lists, the "you" sheet with dark and light
- [x] Feed, courses, mentors, experts, opportunities, CV and business pages hidden (their data is untouched)

- [x] Sign in with a number or an email and a code, in a sheet, at the moment of contact
- [x] Worker profile as a client sees it; chat; calls
- [x] The job, step by step, for both sides
- [x] Worker sign-up: main skill, how you work, your number, "You're on getit"
- [x] Say it instead of typing; AI understanding on the server (the key is a function secret, never in the app)
- [x] Light mode on every screen, including the older ones
- [x] Messages from the server (SMS, notifications, emails) say getit

Next, in order:
- [ ] Asking for prices with the live status line; offers; booking (today: the older post-a-job screen and sheets)
- [ ] Rating, problems and cancelling as in the design (today: the older sheets)
- [ ] Worker prices, photos, ID check, requests and offers as in the design
- [ ] Server: urgency, searching in rounds, on hold, reliability (see the loopholes doc)
- [ ] The app's hidden ID and link scheme still say `bolo` (`cm.bolo.app`, `bolo://`). Changing the ID needs a new
      `google-services.json` from Firebase for the new ID (only the owner can create it), and makes it a
      different app to phones: it installs next to the old one instead of updating it.

Later (1.1): getit Pro, the agent and the assistant.

## Checking a build

Three emulator tours walk the app and save a picture of each screen, in dark and light:
`.maestro/signedout.yaml` (looking without an account), `.maestro/g1-work.yaml` (a new worker joins) and
`.maestro/g2-hire.yaml` (someone finds that worker, makes an account, chats, calls, asks for prices).
Start **Android** by hand on the branch to build and run them; pictures land on the `ci-logs/qa-<run>` branch.
The tours from before the redesign are skipped (`OLD_TOURS=1` runs them).

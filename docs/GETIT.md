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
| `src/ui/*`, `src/components/*`, `src/sheets/*` | The screens from before the redesign. `src/ui/theme.ts` now carries getit's dark colours, so they already look like the same app; each is replaced by a `src/g` screen in turn. |
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

Next, in order:
- [ ] Sign in with a phone number and a code, in a sheet, at the moment of contact (today: the old sign-up screens)
- [ ] Worker profile as a client sees it; calling; chat
- [ ] Asking for prices with the live status line; offers; booking
- [ ] The job, step by step (client and worker); rating; problems; cancelling
- [ ] Worker sign-up (main skill, how you work), prices, photos, ID check, requests and offers
- [ ] Say it instead of typing (needs a speech add-on in the app)
- [ ] Server: urgency, where it happens, searching in rounds, on hold, reliability (see the loopholes doc)
- [ ] The app's hidden ID and link scheme still say `bolo` (`cm.bolo.app`, `bolo://`): changing them needs a new
      push-notification file from Firebase, so it waits for that. Messages sent by the server (SMS, pop-ups) still
      say bolo too.

Later (1.1): getit Pro, the agent and the assistant.

## Checking a build

The emulator tour (`.maestro/signedout.yaml`) walks the new screens signed out and saves a picture of each, in
dark and light. Start **Android** by hand on the branch to build and run it; pictures land on the
`ci-logs/qa-<run>` branch. The older tours are skipped until their flows are rebuilt (`OLD_TOURS=1` runs them).

# bolo backend — how it runs

The full plan is the "bolo Backend Plan" doc. This file is the working guide: where things live, how changes reach the servers, and the one-time setup.

## Where things live

| Path | What |
|---|---|
| `supabase/migrations/*.sql` | The database, in numbered steps. Every change is a new file; old files are never edited after they reach production. |
| `supabase/tests/database/*.test.sql` | Security tests (pgTAP): who can read and write what. One test per rule. |
| `supabase/functions/*` | Server functions (Edge Functions). Only these may use the service key. |
| `supabase/config.toml` | Settings for the local test copy and for deploys. |
| `.github/workflows/backend.yml` | Tests every change, deploys to staging and production. |
| `src/lib/supabase.ts`, `src/logic/remote.ts` | The app's side. |
| `src/lib/monitor.ts` | Crash reporting (Sentry). |

## How a change reaches the servers

1. A change under `supabase/` is pushed.
2. **Backend → Migrations & security tests** starts a fresh Supabase on GitHub, applies every migration, runs all security tests, then re-runs every migration to prove it is safe to repeat.
3. If that passes on `main`, **Deploy to staging** applies it to `bolo-staging`.
4. Production changes only when someone starts **Backend** by hand with **target = production** (Actions → Backend → Run workflow). The `production` environment can require your approval first.

Nothing on production is changed by hand in the SQL Editor any more. If you need a change, it becomes a migration.

## One-time setup

All of these are done in the Supabase and GitHub websites. Never paste keys or passwords into chat, the app or the repo.

### 1. Create the staging project
Supabase → **New project** → name `bolo-staging`, region **Central EU (Frankfurt)**, choose a strong database password and keep it in your password manager. The free plan is fine for staging.

### 2. Supabase access token
Supabase → your avatar → **Account preferences → Access tokens** → **Generate new token**, name it `github-actions`.

### 3. GitHub secrets (GitHub → repo → Settings → Secrets and variables → Actions → **Secrets**)

| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | the token from step 2 (from the account that owns staging) |
| `PROD_SUPABASE_ACCESS_TOKEN` | only if production is in a different Supabase account: a token made in that account |
| `STAGING_DB_PASSWORD` | the staging database password |
| `PROD_DB_PASSWORD` | the production (`uwthkgtgemxakicvqugp`) database password. Reset it under Project Settings → Database if you don't have it. |

### 4. GitHub variables (same page → **Variables** tab). These are public values.

| Name | Value |
|---|---|
| `STAGING_PROJECT_REF` | the staging project's reference id (Project Settings → General) |
| `PROD_PROJECT_REF` | `uwthkgtgemxakicvqugp` |
| `STAGING_SUPABASE_URL` | `https://<staging ref>.supabase.co` |
| `STAGING_SUPABASE_KEY` | the staging **publishable** key (Project Settings → API Keys). Never the secret key. |
| `SUPABASE_URL`, `SUPABASE_KEY` | optional: the production URL and publishable key. If empty, the app uses the ones built into it. |
| `SENTRY_DSN` | optional: from sentry.io → Project → Client Keys (DSN). Crash reports stay off until it's set. |

### 5. Protect production
GitHub → Settings → **Environments** → `production` (it appears after the first deploy, or create it) → **Required reviewers** → add yourself.

### 6. First deploy to production
Actions → **Backend** → **Run workflow** → target `production`. This applies 0001 (already there; safe to repeat), 0002 (activity) and 0003 (foundations), and deploys the `delete-account` function.

### 7. Make yourself an admin
After the production deploy, in Supabase → SQL Editor (this is the one manual step, because admins can't appoint themselves):

```sql
insert into public.admin_users (user_id, role)
select id, 'owner' from auth.users where email = '<your login email>';
```

## What's in the database now

| Migration | Adds |
|---|---|
| 0001 accounts | profiles (public and private), business pages, RCCM/NIU, profile photos |
| 0002 activity | posts, comments, notifications (only from triggers), notification settings, courses, enrolments, course ratings, job photos |
| 0003 foundations | admins and an append-only audit log, rate limits, blocks, reports (the moderation queue), ID and business verification with a private documents bucket, push tokens, private exact location with a public ~1 km area, account deletion, data export, app config (minimum app version, maintenance switch) |
| 0004 marketplace | posts and jobs (with ~500 m job location), likes, saves, follows, offers/applications, chat (1-to-1, business and group, private files bucket), bookings with each step checked on the server, live location while the worker is on the way, reviews after confirmed jobs, course listings and their ratings, internships/programs and applications, mentorships with their group chat, career experts (approved by bolo), realtime on chat, bookings, location, offers and notifications |
| 0005 course seed | the 17 real courses picked by bolo (links to the provider's site) |
| 0006 calls | voice and video calls in 1-to-1 chats: ringing, accepted, ended, missed; the call log in the chat; rate limits |
| 0007 push | every new notification row asks the `push` server function (through pg_net) to send a phone pop-up; the function's address and secret are set by the function at deploy |

### Calls (Agora)
Media goes through Agora. The `agora-token` server function gives a 2-hour pass for one call, only to its two people.
Set **variable** `AGORA_APP_ID` and **secret** `AGORA_APP_CERTIFICATE` (Agora console → project in Secured mode); the Backend deploy copies them into the server functions' secrets. Without them, calls say "Calls aren't switched on yet". Incoming calls ring while bolo is open; when bolo is closed, a call pop-up opens the call screen.

### Push notifications (Firebase)
`google-services.json` (Firebase project `bolo-d659c`, app `cm.bolo.app`) is in the repo: it holds no secrets.
Set **secret** `FCM_SERVICE_ACCOUNT` to the whole service-account file (Firebase → Project settings → Service accounts → Generate new private key). The Backend deploy stores it in the server functions' secrets with a fresh `PUSH_SECRET`, deploys the `push` function and tells the database its address.
Pop-ups follow Settings → Notifications and muted chats (those rows are never made). Phones register at sign-in (`register_push_token`) and remove their token at sign-out; tokens Firebase reports as gone are deleted.

### Errors (Sentry)
Set **secret** `SENTRY_AUTH_TOKEN` and **variables** `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_DSN`. Release builds report crashes; the **Sentry report** workflow (daily, or Run workflow) saves the latest issues to the branch `ci-logs/sentry-latest`.

### How the app uses it
- `src/logic/server.ts` loads everything for the signed-in account and keeps it live (Supabase realtime).
- `src/logic/work.ts`, `career.ts`, `comments.ts`, `reviews.ts`, `listings.ts`, `experts.ts` write each action to the server.
- `src/logic/tracking.ts` shares the worker's position while on the way (only while bolo is open).
- There is no demo mode and no sample data: everything comes from real accounts.
- Money is switched off in `src/logic/money.ts` until a payment provider is connected: no wallet, escrow, Pro or ads; people pay each other directly.

### Testing with the emulator
The emulator tour always checks the signed-out screens. To also tour the app signed in, create a test account in the app and add two GitHub secrets: `QA_EMAIL` and `QA_PASSWORD`.

### Admin actions (sign in as an admin, call from the SQL Editor or the future admin site)

| Function | Does |
|---|---|
| `admin_review_verification(id, approve, note)` | approves or rejects an ID or business check, sets the badge, notifies the person |
| `admin_resolve_report(id, status, note)` | closes a report (`reviewing`, `actioned`, `dismissed`) |
| `admin_set_pro(user, regular, business)` | gives or removes Pro until payments are live |
| `admin_review_expert(user, status, note)` | moves a career expert application on (`review`, `interview`, `approved`, `declined`); approved experts show in Career |

Each one writes `audit_log`, which nobody can edit or delete.

### Asking everyone to update the app
Table Editor → `app_config` → `min_version` → set `android` to the build number of the release everyone must have (the number in the APK name, e.g. `112`). Older builds then show **Update bolo** when they open.

## Tests

To add a rule, add a test next to the others in `supabase/tests/database/` and raise the number in `select plan(n)`. A pull request that breaks a rule fails the Backend check.

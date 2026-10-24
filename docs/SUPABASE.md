# bolo × Supabase

Project: `uwthkgtgemxakicvqugp` (https://uwthkgtgemxakicvqugp.supabase.co)

The app ships with the project URL and the **publishable** key (`src/lib/supabase.ts`). That key is meant to be public: every table is protected by row-level security. Never put the `service_role` / secret key or the database password in the app or in this repo.

## Phase 1 — accounts, profiles, business pages

### 1. Create the tables (once)

Supabase → **SQL Editor** → **New query** → paste the whole of [`supabase/migrations/0001_accounts.sql`](../supabase/migrations/0001_accounts.sql) → **Run**.
It is safe to run again. It creates:

| Table | Who can read | Who can write |
|---|---|---|
| `profiles` | everyone (public profile) | the owner (plan and verification fields: bolo only) |
| `profiles_private` | the owner | the owner |
| `businesses` | everyone (company page) | the owner (verification: bolo only) |
| `business_private` (RCCM, NIU) | the owner | the owner |
| storage bucket `avatars` | everyone | each user, in their own folder |

### 2. Turn on email codes

The app asks for a **6-digit code** after sign-up and for password resets. Supabase sends a **link** by default — that's why the email has no code. The code only appears if the email template contains `{{ .Token }}`:

Authentication → **Emails** (Email Templates):

- **Confirm signup** — replace the body with, for example:
  ```html
  <h2>Welcome to bolo</h2>
  <p>Your code is <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
  <p>It expires in 1 hour. If you didn’t sign up, ignore this email.</p>
  ```
- **Reset password** — same idea:
  ```html
  <h2>Reset your bolo password</h2>
  <p>Your code is <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
  ```

Authentication → **Sign In / Providers** → Email: keep **Confirm email** on, and set **Email OTP length** to `6`.

If someone still gets a link (old template, or an email sent before the change), they can tap it and then tap **“Got a link instead? I’ve tapped it”** on the code screen — the app logs them in with the password they just chose.

Supabase’s built-in mailer only sends a few emails per hour. Before real users arrive, add your own sender under Authentication → **SMTP Settings** (Brevo, Resend, Mailgun… all have free tiers).

### 3. Phone numbers (any country)

The phone field has a country picker with every dialling code (it starts on the phone's own country). Numbers are stored and sent as `+<country code><number>`, e.g. `+79151234567` for Russia, `+237677123456` for Cameroon.

Phone sign-up needs an SMS provider: Authentication → **Sign In / Providers** → **Phone** → choose Twilio, Vonage or MessageBird and paste its keys. Until then the app tells people to use email.

Some countries filter SMS from unknown senders. **Russia** is one of them: Vonage may need a registered sender ID before codes arrive (Vonage dashboard → Messaging → sender ID / country restrictions). Test with your own number first; if nothing arrives, check the Vonage message logs.

For testing without SMS you can add test numbers there (e.g. `237677000000` → code `123456`).

### 4. Verifying businesses

When a business adds its RCCM and NIU, it shows **Verification in progress**. To approve it: Table Editor → `businesses` → set `verified` to `verified` (or back to `none`). The app picks it up the next time it opens.

### 5. Giving someone Pro (until payments are live)

Table Editor → `profiles` → set `pro_regular` or `pro_business` to `true`.

## How the app uses it

- `src/lib/supabase.ts` — client (session kept in AsyncStorage, refreshed while the app is open)
- `src/logic/remote.ts` — sign-up / log-in / codes / password reset, and syncing the profile and business pages (debounced, only changed data is sent; photos are uploaded to `avatars/<user id>/`)
- Everything else (jobs, chats, bookings, career) is still sample data on the phone. It moves to Supabase in the next phases.
- **Demo mode**: on the welcome screen, “Explore the demo” runs the app fully offline with sample data and the code `1234` — useful for showing the app and for automated tests.

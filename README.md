# Progressive Overload Tracker

A mobile-first gym tracker. Log weight, reps, and sets, tap **Easy / Just Right / Hard**, and get the next session’s target.

Passwordless login uses a 6-digit email code via Supabase. Days, exercises, and logs are stored per account. Next-session targets come from `lib/suggestNext.ts`.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Paste your project values from [Supabase → Settings → API](https://supabase.com/dashboard/project/_/settings/api):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Supabase, run `supabase/migrations/20260830000000_init.sql` (SQL Editor).
4. Authentication → Email: enable email signups. Use a 6-digit OTP in the email template (`{{ .Token }}`), not only a magic link.

Never commit `.env.local`. Never put the `service_role` key in client code.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43127

## How suggestions work

Each exercise has a rep range (default 6–10) and a plate increment (default 2.5 kg).

- **Hard** — same weight and reps next time
- **Just Right** — add 1 rep, or if you already hit the top of the range, add the increment and drop back to the bottom
- **Easy** — jump 2 reps (capped at the top), or add weight if you already hit the top

## Tests

```bash
npm test
```

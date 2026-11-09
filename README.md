# Split — MVP (Phase 1)

Link-based bill splitting for friends in Pakistan. The organizer creates a split, drops one link in the
WhatsApp group, each friend taps their name, sees their share and the organizer's Raast / IBAN / wallet
details, pays directly, and taps **I've paid**. The organizer confirms. Everyone sees a live "who has paid"
board. The app never touches money.

Spec: see `split-app-mvp-spec.md` (Phase 1).

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript) + **Tailwind v4**
- **Supabase**: Postgres, Auth (email magic link + Google), Storage (payment screenshots)
- **Vercel** for hosting
- WhatsApp sharing via `wa.me` links (no API)
- Optional email notifications via **Resend**

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys, see supabase/README.md
npm run dev
```

Open http://localhost:3000.

## Project layout

```
src/
  app/
    page.tsx                 Landing
    login/                   Magic link + Google login
    auth/callback/route.ts   Supabase auth redirect handler
    (app)/                   Organizer area (requires login)
      home/                  List of splits
      splits/new/            New split form (equal / custom, live validation)
      splits/[id]/           Split detail: share link, board, confirmations, reminders, close
      splits/[id]/edit/      Edit title/date/note; amounts locked once anyone has paid
      groups/                Saved groups of names
      profile/               Name + payment details
    s/[code]/                Public payer page (no login): claim name → pay → I've paid
  lib/
    supabase/                Browser, server (RLS) and admin (service role) clients + auth proxy
    money.ts                 PKR formatting, equal-split rounding
    whatsapp.ts              Share / reminder message builders + wa.me links
    splits.ts                Data access for organizer and public views
    analytics.ts             Event tracking into the `events` table
    email.ts                 "Marked paid" notification (Resend, optional)
  proxy.ts                   Session refresh + route protection
supabase/
  migrations/0001_init.sql   Schema, RLS policies, storage bucket, auto-settle trigger
```

## How security works

- Organizer pages use the user's session with the anon key. **Row Level Security** restricts every table to
  the owner's rows.
- The public payer page is anonymous. The server uses the **service role** key and validates every write
  against a random **claim token** stored in an HttpOnly cookie when the payer taps their name.
  A payer can only mark *their own* claimed share as paid.
- Screenshots go to a private bucket; the organizer sees them via 1-hour signed URLs.

## Analytics

Events tracked in `public.events`: `split_created`, `link_opened`, `name_claimed`, `marked_paid`,
`confirmed`, `rejected`, `split_settled`, `split_closed`, `reminder_sent`.

Example queries for the week-8 review:

```sql
-- % of splits settled within 48h
select round(100.0 * count(*) filter (where settled_at - created_at <= interval '48 hours') / count(*), 1)
from splits where status = 'settled';

-- repeat organizers (3+ splits)
select count(*) filter (where n >= 3) * 100.0 / count(*) as pct_repeat
from (select owner_user_id, count(*) n from splits group by 1) t;
```

## Deploy

1. Push to GitHub, import in Vercel.
2. Add the env vars from `.env.example` (set `NEXT_PUBLIC_APP_URL` to the production URL).
3. In Supabase → Auth → URL Configuration, add `https://<your-domain>/auth/callback` to redirect URLs.

## Not in Phase 1

Automated WhatsApp reminders, payment verification, receipt OCR, native app, net settlement across splits.

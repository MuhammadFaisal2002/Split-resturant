# Split — MVP Spec (Phase 1)

**Version:** 1.0 · **Date:** 2026-11-09 · **Owner:** Faisal
**Status:** Ready for development

---

## 1. One-line summary

A link-based web app that lets one person (the organizer) split a shared bill among friends, send each friend their share via a single WhatsApp link, and track who has paid — without anyone installing an app or the product ever touching money.

## 2. Problem

When friends eat out, one person pays the full bill and then has to chase others for their share. Asking is awkward, tracking is manual (WhatsApp + Easypaisa screenshots), and one or two people routinely delay or never pay. The burden lands on the organizer.

## 3. What this product does (and does not do)

**Does**
- Splits a bill equally or by custom amounts.
- Generates one short link the organizer drops into the group chat.
- Shows each friend their exact share and how to pay the organizer directly (Raast ID / IBAN / wallet number).
- Lets friends mark "Paid"; organizer confirms.
- Shows a live "who has paid" board visible to everyone with the link.
- Gives the organizer ready-to-forward reminder messages.

**Does NOT (Phase 1)**
- Hold, route, or process money. All payments are direct peer-to-peer outside the app.
- Verify payments automatically. No bank/wallet integration.
- Require payers to sign up or install anything.
- Scan receipts (OCR), integrate with restaurants, or send automated WhatsApp messages.
- Have a native mobile app. Mobile-first responsive web only.

## 4. Users

| Role | Who | Needs account? |
|---|---|---|
| Organizer | The person who paid the bill | Yes (phone OTP or Google) |
| Payer | Each friend who owes a share | No — opens link, taps their name |

## 5. Core user flow

### 5.1 Organizer creates a split
1. Opens app → logs in (first time only).
2. Taps **New Split**.
3. Enters: title (e.g. "Dinner at Kolachi"), total amount (PKR), date (default today).
4. Adds people: types names, or picks a saved group.
5. Chooses split type:
   - **Equal** — total ÷ number of people (organizer included by default; toggle to exclude self).
   - **Custom** — enters each person's amount; app validates that the sum equals the total.
6. Confirms payment details shown to payers (saved from profile: Raast ID, IBAN, JazzCash/Easypaisa number — at least one required).
7. Taps **Create** → gets a short link, e.g. `split.app/s/x7k2`, with a **Share on WhatsApp** button that opens WhatsApp with a pre-filled message.

### 5.2 Payer opens the link
1. Sees: split title, total, organizer's name, list of names with status.
2. Taps their own name → is "claimed" (stored in a cookie/localStorage so the same device stays mapped to that name).
3. Sees: **Your share: Rs 2,280**, organizer's payment details with one-tap **Copy** buttons.
4. Pays through their own banking/wallet app (outside our product).
5. Taps **I've paid** → optional: upload screenshot, add note. Status becomes **Pending confirmation**.

### 5.3 Organizer confirms
1. Receives in-app notification (and email, if set).
2. Sees pending claims with screenshot/note → taps **Confirm** or **Reject** (reject returns status to Unpaid with an optional reason).
3. Board updates for everyone.

### 5.4 Reminders (manual in Phase 1)
- On the split page, organizer sees **Remind pending** → app generates a short message listing only unpaid names and the link, with a **Send via WhatsApp** button.
- Suggested cadence shown as hints: Day 1, Day 3, Day 7. No automation yet.

### 5.5 Closing
- When all shares are confirmed, split auto-marks **Settled**.
- Organizer can also manually **Close** a split (e.g. decided to let it go) — remaining shares marked **Waived**.

## 6. Screens

**Organizer (logged in)**
1. Login (phone OTP / Google)
2. Home — list of splits (Open / Settled), New Split button
3. New Split form
4. Split detail — board, pending confirmations, Remind, Share, Close
5. Groups — saved sets of names (create/edit)
6. Profile — name, payment details, email for notifications

**Payer (public link, no login)**
7. Split public page — claim name → share + payment details → I've paid
8. Confirmation state (Pending / Confirmed)

## 7. Data model

```
users
  id, phone, email, name, raast_id, iban, wallet_number, wallet_type, created_at

groups
  id, owner_user_id, name, created_at

group_members
  id, group_id, display_name

splits
  id, owner_user_id, title, total_amount (int, PKR), split_type (equal|custom),
  include_self (bool), status (open|settled|closed), short_code (unique), created_at, settled_at

split_shares
  id, split_id, display_name, amount (int, PKR),
  status (unpaid|pending|confirmed|rejected|waived),
  claimed_token (nullable), screenshot_url (nullable), note (nullable),
  marked_paid_at, confirmed_at

reminders_log
  id, split_id, sent_at, channel (whatsapp_manual)
```

Amounts stored as integers (PKR, no paisa). Short codes: 4–6 chars, base36, unique.

## 8. Tech stack (recommended)

- **Frontend:** Next.js (App Router), Tailwind. Mobile-first.
- **Backend / DB / Auth:** Supabase (Postgres, Auth with phone OTP + Google, Storage for screenshots).
- **Hosting:** Vercel (free tier).
- **Short links:** own route `/s/[code]` — no third-party shortener.
- **WhatsApp share:** `https://wa.me/?text=<encoded message>` — no API cost.
- **Email notifications:** Resend or Supabase built-in (low volume).

Phase 1 recurring cost target: under PKR 5,000 total for the first 3 months (domain + nothing else).

## 9. Key rules & edge cases

- Custom split must sum exactly to total; show the remaining amount live while typing.
- Equal split rounding: distribute remainder rupees to the first N people so the sum matches exactly.
- A name can be claimed by only one device; organizer can **unclaim** a name if someone tapped the wrong one.
- Payer page must work without JS cookies blocked (fallback: show "select your name" each visit).
- Organizer can edit a split only while no share is Confirmed; after that, amounts are locked (can still add a note).
- All public pages are read-only except claim / I've paid actions on the claimed share.
- No personal data of payers stored beyond display name + optional screenshot. Screenshots deleted 30 days after settle.

## 10. Copy / tone

- Roman Urdu + English mix is fine where natural ("Aapka share: Rs 2,280").
- Reminder messages are polite and clearly come from the app, not the person:
  > "Reminder from Split: Rs 2,280 pending for *Dinner at Kolachi*. Pay details & status: split.app/s/x7k2"

## 11. Analytics (must have from day 1)

Track these events in a simple table or Posthog free tier:
- `split_created`, `link_opened`, `name_claimed`, `marked_paid`, `confirmed`, `split_settled`, `reminder_sent`

Success metrics to review after 8 weeks:
1. **% of splits fully settled within 48 hours** (target: > 60%)
2. **Repeat organizers** — organizers with 3+ splits (target: > 30% of organizers)
3. **Payer → organizer conversion** — people who first appeared as payers and later created their own split

If metric 2 is below 15% at week 8, stop and reassess.

## 12. Out of scope — Phase 2 candidates (do NOT build now)

- Automated WhatsApp reminders (WhatsApp Business API — paid)
- Net settlement across multiple splits in a group
- Recurring groups with running balances
- Reliability indicators per person
- Receipt OCR
- Native app
- Any payment integration / partner

## 13. Delivery plan

| Week | Deliverable |
|---|---|
| 1 | Auth, profile, New Split (equal + custom), short link, share to WhatsApp |
| 2 | Public payer page, claim name, I've paid + screenshot, organizer confirm, board |
| 3 | Groups, reminders generator, settled/close states, analytics events, polish, deploy |

Test with 3–5 real friend groups starting end of week 3.

## 14. Open questions

1. Phone OTP vs Google-only login for organizer? (Phone OTP has a cost at scale; Google is free. Recommend Google + email magic link for MVP.)
2. Should the organizer be able to add themselves as a payer when someone *else* paid? (Suggest: yes — "Who paid?" field, defaults to me.)
3. Product name and domain — TBD.

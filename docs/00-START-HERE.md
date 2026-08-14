# čārana — Engineering Handover

**Written:** 2026-08-24 · **Updated:** 2026-08-14 (evening)
**Repo:** https://github.com/farjadp/carana — branch `main`, all work pushed
**Live:** https://charana.ca
**Local:** `/Users/farjad/Downloads/Work-Studio/Charana`
**Task board:** Notion → 🧿 Charana → Mission Control (the live source of
truth for what is open, who owns it, and per-task instructions). Standing
rule: every piece of work — planned, in progress, done — is also recorded
there, not only in git.

---

## Where things stand, in sixty seconds

The web app is **live** at charana.ca with 677 published listings, real
photography, working email + SMS, cookieless analytics, and first-party error
telemetry. The mobile app **runs on Farjad's physical iPhone** (free signing,
7-day builds). The verification system — the product's core trust mechanic —
is built end to end and needs its first real-world test.

| Area | State |
|---|---|
| Web (Next.js 16) | Live, auto-deploying from `main` (pipeline verified) |
| Search | **Does not exist.** Hero box is a prop. The open P0. |
| Verification | Built: self-onboarded + SMS-claim paths, 6-month expiry, renewal cron (needs `CRON_SECRET`), badges honest everywhere |
| Claim flow | `/claim` live — SMS to the number already on the listing |
| Database | 20 migrations, history in sync, RLS hardened, telemetry tables (`system_errors`, `cron_runs`), `view_count` live |
| Imagery | 12 category photographs + 8 city backgrounds, one campaign, WebP |
| Email | Resend live; **Supabase auth mail still needs dashboard SMTP/templates/URLs** → `13-…` |
| SMS | Twilio live (rotate the leaked auth token; balance low) |
| Mobile | Runs on device; email confirmation deep-links into the app (`charana://auth/confirmed`) |
| App Store / Play | Blocked on D-U-N-S for Ashavid Inc. |
| Analytics | Vercel Web Analytics (cookieless) + Search Console registered |

## What to do first when you wake up

1. Read `08-open-tasks.md` — it now begins with the one Supabase dashboard
   session that fixes real signups, then the code queue (search is the P0).
2. Open the Notion board for the live picture before starting anything.
3. `09-gotchas.md` before debugging **anything** — every entry cost hours.

## Reading order

| File | Read it when |
|---|---|
| `01-architecture.md` | You want the shape of the system |
| `02-security.md` | Before touching auth, RLS, or anything admin |
| `03-database.md` | Before writing a migration or a query |
| `04-deployment.md` | Deploying, or something is broken in production |
| `05-mobile.md` | Picking the mobile work back up |
| `06-data-import.md` | Importing another directory export |
| `07-design.md` | Brand, colours, the photography system, logo brief |
| `08-open-tasks.md` | Deciding what to do next |
| `09-gotchas.md` | **Read this one.** The traps that cost hours. |
| `10-accounts.md` | Accounts and credentials |
| `11-session-log.md` | How we got here, session by session |
| `12-integrations.md` | Email, SMS, verification, telemetry, analytics |
| `13-supabase-email-templates.md` | Paste-ready auth email templates |

## Working style (learned, do not relearn)

- Act without asking; deliver, then report. Farjad reviews outcomes.
- Never hand-draw illustrations. Imagery goes through the OpenAI image API
  scripts in `scripts/` (category, city) with their locked art-direction
  blocks — probe 1–3 images before a batch.
- Honesty in UI is a hard rule here: no badge, count, button or claim that
  is not backed by real state. Several shipped violations were found and
  removed (unconditional "تایید شده" chips, fake report toast, "reviewed by
  team" copy). Check for this class when reviewing anything.
- When auditing "the site", enumerate routes from `sitemap.xml` — the home
  page was once the only surface not checked, and it was the one that lied.

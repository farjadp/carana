# čārana — Engineering Handover

**Written:** 2026-08-24 · **Updated:** 2026-08-16 · **Docs version:** 2.0
**Repo:** https://github.com/farjadp/carana — branch `main`, all work pushed
**Live:** https://charana.ca
**Local:** `/Users/farjad/Downloads/Work-Studio/Charana`
**Task board:** Notion → 🧿 Charana → Mission Control (the live source of
truth for what is open, who owns it, and per-task instructions). Standing
rule: every piece of work — planned, in progress, done — is also recorded
there, not only in git.

---

## Where things stand, in sixty seconds

The web app is **live** at charana.ca with 680 published listings (677
imported + Farjad's three showcase listings), a brand-first home page with
live counters, **real search** (Persian-aware, ranked, wrong-keyboard
forgiving), redesigned business profiles on web + mobile, business
registration with AI website import on web + mobile, branded auth mail via
Resend, and a downloadable Android APK (1.1.0). The mobile app runs on the
simulator and Farjad's iPhone; store publishing is blocked on D-U-N-S.

| Area | State |
|---|---|
| Search | **Built 15 Aug.** `search_businesses` RPC + `/search` + header + hero + mobile tab; every query logged in `search_queries` |
| Home | Brand hero, live counters (680 · 3 verified · 24 cities · 12 categories), real search, direct APK button |
| Business profile | Redesigned web + mobile: cover, verified badge, open-now, actions, services, hours, ref number |
| Registration | Web + mobile: verify email+phone → optional "read it from my website" (AI) → 7 steps → review → submit |
| Claim | `/claim` = find-your-business search; `/claim?businessId=` = 3-step SMS proof; Persian-digit-safe |
| Auth mail | Supabase → Resend SMTP, four Persian templates, Site URL + redirects incl. `charana://**` — verified with a live signup |
| Reference numbers | `businesses.ref_no` five-digit random unique on all rows, shown on profiles |
| Accounts | Admin `farjad@ashavid.ca` (role admin); personal `its@farjadp.com` (owner of the 3 listings); old `admin@charana.ca` can retire |
| Pages | About / Team / Roadmap / Releases / Download / Contact / Support written for real; About dropdown in header |
| Mobile | v1.1.0 APK on EAS under @ashavid; deep links verified via assetlinks; in-app profile edit; brand redesign |
| Android app links | `ANDROID_SHA256_FINGERPRINT` live on Vercel; assetlinks.json serves it |
| Verification | Built end to end; renewal cron still needs `CRON_SECRET` |
| App Store / Play | Blocked on D-U-N-S for Ashavid Inc.; store URLs live in `lib/data/releases.ts` — fill and every surface flips |

## What to do first when you wake up

1. Read `05-open-tasks.md` — what is open, split into your side and mine.
2. Open the Notion board (🧿 Charana → Mission Control) for the live picture.
3. `06-gotchas.md` before debugging **anything** — every entry cost hours.

## Reading order

Eight files, deliberately. They were fifteen until 16 Aug; the split made
people (and models) read three of them and miss the rest.

| File | Read it when |
|---|---|
| `01-product.md` | What exists today per audience, plus the design system, brand and logo pack |
| `02-engineering.md` | The shape of the system: architecture, database, deployment, integrations, auth mail, data import |
| `03-security.md` | Before touching auth, RLS or anything admin — and where every credential lives |
| `04-mobile.md` | Picking the mobile app back up |
| `05-open-tasks.md` | Deciding what to do next |
| `06-gotchas.md` | **Read this one.** The traps that cost hours. |
| `07-session-log.md` | How we got here, session by session, including what was said wrongly |

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

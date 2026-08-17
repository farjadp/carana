# čārana — Engineering Handover

**Written:** 2026-08-24 · **Updated:** 2026-08-16 · **Docs version:** 2.6
**Repo:** https://github.com/farjadp/carana — branch `main`, all work pushed
**Live:** https://charana.ca
**Local:** `/Users/farjad/Downloads/Work-Studio/Charana`
**Task board:** Notion → 🧿 Charana → Mission Control (the live source of
truth for what is open, who owns it, and per-task instructions). Standing
rule: every piece of work — planned, in progress, done — is also recorded
there, not only in git.
**Docs mirror:** Notion → 🧿 Charana → 📄 Docs, with 🕓 Doc Revisions as the
durable change log (version, commit, and *why*). Git stays the source of
truth; if a Notion page disagrees with a file here, the file wins. When a
doc changes, update its Notion page and add one Revisions row.

---

## Where things stand, in sixty seconds

The web app is **live** at charana.ca with 680 published listings (677
imported + Farjad's three showcase listings), a brand-first home page with
live counters, **real search** (Persian-aware, ranked, wrong-keyboard
forgiving), redesigned business profiles on web + mobile, business
registration with AI website import on web + mobile, branded auth mail via
Resend, and a downloadable Android APK (**1.2.0**, 16 Aug). The mobile app
runs on the simulator and Farjad's iPhone; store publishing is blocked on
D-U-N-S.

| Area | State |
|---|---|
| Search | Persian-aware RPC, **metro-aware city filter** (Toronto ⊃ North York…), wrong-keyboard forgiving, widen-on-empty; every query logged |
| SEO / GEO | City × category pages (96 combos, 21 indexable), JSON-LD everywhere, `LocalBusiness` on profiles, `llms.txt` + `llms-full.txt` |
| Blog | 7 categories, generator runs daily 11:00 UTC into a review queue, fal.ai brand imagery; live on web **and in the app** |
| Business profile | Web + mobile: cover, verified badge, open-now, action row, ref number, **working report button** |
| Conversion events | `business_events` from both surfaces; owner insights at `/dashboard/business/[id]/insights` |
| Billing | **Stripe subscriptions built and tested in sandbox**: checkout, portal, webhook, invoices, `/pricing`, server-side entitlements. Live mode needs the dashboard work in `05-open-tasks` |
| Featured placement | **Fully renders.** City × category lists, `/cities/[slug]`, `/search`, and the home page's «ویژه» section all sort featured-first (expiry-aware) and show the chip on `BusinessCard`; nobody has bought it yet, so nothing shows today — that's correct, not broken |
| Plans v2 | Pro → **استارتر (Starter)**, Featured → **پریمیوم (Premium)** (display names only — `PlanId` stays `pro`/`featured`, see `lib/billing/plans.ts`). Five tiered features shipped: **gallery**, **review replies**, **busy now/quiet now** (mobile display too), **announcements**, **vanity English URL**. Plus **announcement discovery** (not plan-gated): homepage feed + opt-in follow-and-email. SMS/push channels, price-list extraction, and mobile owner screens are backlog — tracked in Notion Mission Control |
| Header CSS bug | **Fixed 16 Aug.** Two `.site-header` definitions were fighting since the Aug 23 rebuild — old padding/border-radius/box-shadow leaked through at every width, and `position: sticky` was lost entirely below 720px. See `06-gotchas.md` |
| Home page | **Redesigned 16 Aug (`484866f`)** around search-first. Killed three duplications (newest/popular showed the same businesses, owner CTA appeared 3×, trust argued twice + legal links repeated from the footer) and two bugs (`/categories/all` 404 link, hard-coded `+۶۷۷` chip vs the live 680) |
| Footer status bar | **Live, web + app.** Tehran clock, Jalali + Shahanshahi date (shared logic in `@charana/core`), real free-market USD/EUR/CAD via Navasan. Key is now set in Vercel, so rates render in production; a 3-day staleness guard drops dead symbols |
| Suggestions | Text or voice, web + app, admin inbox |
| Admin | Listings, categories, reviews, users, logs, suggestions, blog desk, **reports queue**, **city cleanup queue**; sidebar badges are live counts |
| Data gap | **409 listings still say «نامشخص»** — the cleanup queue is built; 365 of them are one click away |
| Mobile | Runs on simulator and a real iPhone. **APK 1.2.0 built and linked 16 Aug** (`229669c`) — and it fixed a real outage: 1.1.0 shipped with no Supabase credentials and could not start at all. 1.2.0 not yet run on a real Android device |
| App Store / Play | Blocked on D-U-N-S for Ashavid Inc. |

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

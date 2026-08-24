# GOPLAZA — Engineering Handover

**Written:** 2026-08-24 · **Updated:** 2026-08-24 (gooyalisting.ca scraped — 7,471 listings, dry-run only) · **Docs version:** 3.10
**Repo:** https://github.com/farjadp/carana — branch `main`, all work pushed
**Live:** https://goplaza.ca (**rebranded from čārana on 2026-08-18** — branch `rebrand/goplaza`; the domain, Supabase URLs, Resend and Stripe still need the dashboard steps in `REBRAND_EXTERNAL_ACTIONS.md` before this is true in production. Until then charana.ca is what resolves.)
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

The web app is **live** at goplaza.ca with **5,802 listings** — seven
Iranian-Canadian directories merged on 17 Aug, an eighth (iranianlawyer.org)
on 23 Aug, and a **ninth scraped on 24 Aug but deliberately not yet
imported**: gooyalisting.ca's 7,471 listings would roughly double the
directory, and that is a decision, not a leftover — see `05-open-tasks`.
The merged seven were: IranJavan (Aug), Hamvatan
(`2384aa5`), then Jabeh, Taablo, Bazaarche, FarsiLink and IranBusiness
(`3cb8868`, `34185f5`), each de-duplicated against what was already there —
a brand-first home page with
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
| Blog | 7 categories, fal.ai brand imagery; live on web **and in the app**. **Two writers:** the data-driven one runs 11:00 UTC, the **source-driven** one (atash.ca → our own article, cited) runs 12:00 UTC — both into the review queue. Posts carry a `key_takeaway` answer block for AIO/GEO. Telegram + LinkedIn syndication is built and env-gated (off). See `13-blog-sources.md`. **Its migration `20260830320000_blog_sources.sql` still has to be run in the SQL Editor** |
| Business profile | Web + mobile: cover, verified badge, open-now, action row, ref number, **working report button** |
| Conversion events | `business_events` from both surfaces; owner insights at `/dashboard/business/[id]/insights` |
| Billing | **Stripe subscriptions built and tested in sandbox**: checkout, portal, webhook, invoices, `/pricing`, server-side entitlements. Live mode needs the dashboard work in `05-open-tasks` |
| Featured placement | **Fully renders.** City × category lists, `/cities/[slug]`, `/search`, and the home page's «ویژه» section all sort featured-first (expiry-aware) and show the chip on `BusinessCard`; nobody has bought it yet, so nothing shows today — that's correct, not broken |
| Plans v2 | Pro → **استارتر (Starter)**, Featured → **پریمیوم (Premium)** (display names only — `PlanId` stays `pro`/`featured`). Five tiered features shipped: **gallery**, **review replies**, **busy now/quiet now**, **announcements**, **vanity English URL**. Plus **announcement discovery** (not plan-gated). `plans.ts` now lives in `@goplaza/core`, so web, mobile and the server clamps read one table. SMS/push, price-list extraction and mobile owner screens are backlog |
| Plans v3 (19 Aug) | **Live.** Fourth tier **پلاتینیوم (Platinum)** — 21-seat cap nationwide, quarterly billing only, feature list TBD (floors at Premium's). Repriced Starter $19→$21/mo, Premium $49→$34/mo. New intervals `2year`/`quarter` (Stripe: interval×interval_count, see `06-gotchas`). Migrations applied via the Supabase SQL Editor, not `db push` — the CLI's own migration-history table may not know, see `05-open-tasks` |
| `/businesses` listing (19 Aug) | **Live.** Default order is **genuinely random, reshuffled every load** — no default sort at all, by design. Featured/Platinum get `FEATURED_RANDOM_BOOST` (89%) more weight in that shuffle, still labelled with the «ویژه» chip. Four explicit sorts: پربازدیدترین، پرمخاطب‌ترین (`saved_count`, backfilled to 0 — nobody has saved a listing yet), جدیدترین، تازه‌تأییدشده |
| Header CSS bug | **Fixed 16 Aug.** Two `.site-header` definitions were fighting since the Aug 23 rebuild — old padding/border-radius/box-shadow leaked through at every width, and `position: sticky` was lost entirely below 720px. See `06-gotchas.md` |
| Home page | **Redesigned 16 Aug (`484866f`)** around search-first. Killed three duplications (newest/popular showed the same businesses, owner CTA appeared 3×, trust argued twice + legal links repeated from the footer) and two bugs (`/categories/all` 404 link, hard-coded `+۶۷۷` chip vs the live 680) |
| Footer status bar | **Live, web + app.** Tehran clock, Jalali + Shahanshahi date (shared logic in `@goplaza/core`), real free-market USD/EUR/CAD via Navasan. Key is now set in Vercel, so rates render in production; a 3-day staleness guard drops dead symbols |
| Suggestions | Text or voice, web + app, admin inbox |
| Admin | Listings, categories, reviews, users, logs, suggestions, blog desk, **reports queue**, **city cleanup queue**; sidebar badges are live counts |
| Data | **All seven directories merged 17 Aug** (`2384aa5` Hamvatan; `3cb8868` + `34185f5` the rest). Per source, inserted / enriched: Hamvatan 1,385 / 59 · Jabeh 1,393 / 375 · Taablo 1,277 / 540 · Bazaarche 500 / 80 · FarsiLink 330 / 194 · IranBusiness 62 / 6 — plus 30 re-inserted after 51 wrong merges were reverted. One record shape (`scripts/lib/source-listing.ts`), one importer (`scripts/import-listings.mts`), one scraper per site (`scripts/scrape-directories.mts`). Coverage now spans Ontario (≈4,350), BC (≈540), Quebec (≈240), Alberta (≈20). Logos re-hosted into Supabase storage. |
| Data — gooyalisting.ca | **Scraped 24 Aug, NOT imported.** The ninth and largest source: 7,471 published listings (`scripts/scrape-gooya.mts`). Dry run: 2,390 match an existing row and enrich it, 4,873 are new, 163 were duplicates inside the export, 44 are held for a human. Committing it roughly doubles the directory. **The decision is item 1 in `05-open-tasks`** |
| Data gap | **≈930 listings say «نامشخص»** — 409 pre-existing (365 one click away in `/admin/cleanup/cities`) plus ≈520 new DRAFT rows whose source gave no city (mostly Jabeh realtors). ≈70 shared-phone / shared-website cases are held for a human — see `05-open-tasks`. Taxonomy gap: 12 categories have no home for travel agencies, cargo, media, charities; they sit in the closest slot with the source label in `sub_category` |
| Mobile | **Caught up with the web on 24 Aug** — see `04-mobile` for the parity table. **Two APKs shipped the same day** — **1.3.0** (EAS `7efff12a`), the first binary carrying the GOPLAZA rebrand, and **1.4.0** (EAS `6f8b7259`, what `/download` serves) carrying the parity work; `app.json` had sat at 1.3.0 unbuilt since 18 Aug, so until now every installed app still said čārana. Credentials confirmed in the bundle before /download was pointed at it. Then in the same session: the «ویژه» chip + the shared 89% random boost, four listing sorts, the **Platinum** tier, smart search and announcement search. **And a real bug the audit only found by running the app:** the home hero read «۱٬۰۰۰ کسب‌وکار» for a 5,251-listing directory — the PostgREST 1,000-row cap the SEO audit fixed on the web on 18 Aug, still live on native; every category, city and province count was a fifth of the truth. Fixed by moving `fetchAllRows` into `@goplaza/core`. Still **no owner controls at all** — no edit, insights, billing, or announcement writing — and no push |
| Owner identity | **New 17 Aug (`5f5c03b`)** — a verified profile names the person behind it (web sidebar + mobile). Four server-side gates: trusted verification, a real person attached (`owner_user_id`, or `created_by` only when `self_onboarded`), a non-empty name, and not hidden. Free and Starter always show it; Premium can hide it (`hide_owner`, new `owner_privacy` feature). The hide is honoured after a plan lapses — a name is not a placement. Rule lives in `packages/core/src/owner-identity.ts` |
| Jobs board | **New 18 Aug.** `/jobs` (filter by type, language, city), `/jobs/[slug]` with **`JobPosting` JSON-LD** — the Google Jobs lever none of the seven competitors has. Only listing owners may post; **verified publishes directly, everyone else queues** at `/admin/jobs`; free and unlimited, with a DB-counted 5-per-business-per-24h rate limit that is deliberately *not* a plan gate. Expiry is a comparison against `now()`, not a status, so no cron keeps it honest. Owner manager at `/dashboard/business/[id]/jobs`, with a **Markdown editor** (toolbar + preview; links, URLs, images and HTML stripped on write *and* on read) and **AI drafting** that is given the row's own facts as its only ground truth and treats the owner's notes as data, not instructions. AI spend counted in `ai_usage`, 10/user/day. **Mobile has the read side** — board, detail, home rail, profile section, account row; posting stays on web. **Mail:** moderation outcome to the poster, and a 3-days-out expiry nudge from a daily cron. Brand photography on the hero and the empty state (`scripts/generate-jobs-images.py`). **Salary optional for now — the Ontario pay-transparency check is still open.** No mail and no mobile yet |
| Reviews | Submit → `pending_moderation` → admin publishes/rejects. **17 Aug (`5c80228`)**: outcome emails to the reviewer (with the moderator's reason), new-review email to the owner (which won't offer a reply the plan refuses), and server-side caps — 5 per user per 24h, 10–2000 chars, no reviewing your own business. **Three product questions still open** — see `05-open-tasks` |
| Features page | `/features` on web + a native mobile screen. Plan quantities read from `@goplaza/core`; both carry an explicit "what we don't have yet" list |
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
| `08-competitors.md` | The seven Iranian-Canadian directories, and where the gaps are |
| `09-jobs-board.md` | **Design only, not built.** Jobs board spec with the four decisions Farjad took on 18 Aug |

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

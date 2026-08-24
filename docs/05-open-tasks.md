# Open tasks

**Updated:** 2026-08-24 — the mobile gap below is now **closed**, including
one bug the audit did not predict. What is still open on mobile is owner
controls and push, both long-standing.

The live board is Notion → 🧿 Charana → Mission Control; this is the narrative.

## Blog sources — what a human still has to do (24 Aug)

The source-driven writer is code-complete and type-clean, and its two model
passes were exercised end-to-end against a live atash.ca article. Three things
are not done, and none of them are code:

1. **Run the migration.** `supabase/migrations/20260830320000_blog_sources.sql`
   in the Supabase SQL Editor — same route as every migration since Plans v3.
   Until it runs, the desk's source panel and the "از منابع بنویس" button will
   error: the tables do not exist.
2. **Read the first batch before publishing it.** `BLOG_AUTO_PUBLISH` is off,
   so the first run lands in the review queue. Read three of them end to end
   for tone, and check that the "منبع خبر" block at the foot points where it
   should.
3. **Decide the Telegram / LinkedIn credentials.** Both adapters are written
   and both are inert without env (see `13-blog-sources.md` for exactly which
   variables and where to get them). Nothing is shared until they exist, and
   nothing claims to have been.

Open questions worth a decision, not blockers:

- **Only atash.ca is seeded.** `blog_sources` takes any WordPress site; adding
  a second is one `insert`. Which ones are worth reading?
- **`fresh_days` is 21 and `BLOG_SOURCE_PER_DAY` is 5.** Five a day exhausts a
  quiet week's news and starts pulling archive; that is by design, but it means
  the mix shifts toward evergreen over time. Watch the run log's notes column.
- **The originality gate is calibrated on two drafts.** Six shared runs, 2%.
  If real runs start getting skipped for overlap, the reason is in the ledger —
  raise it on evidence, not on impatience.

## ~~Mobile is behind the web~~ — closed 24 Aug

Everything below was the audit as written before the work. All five code gaps
are fixed and APK **1.3.0** is built and linked (EAS `7efff12a`), with
**1.4.0** carrying the parity work. Two things the audit did *not* predict
turned up while running the app, both now fixed:

- **The 1,000-row cap was still live on mobile.** The home hero said
  «۱٬۰۰۰ کسب‌وکار» for a 5,251-listing directory, and every category, city and
  province count was a fifth of the truth. `fetchAllRows` (the 18 Aug fix)
  lived in `apps/web`, so native never got it; it is now in `@goplaza/core`.
- **The listing screens printed a page size as a total** — «۱۰۰ کسب‌وکار» for
  a Toronto category matching 1,699. They now say «۱۰۰ از ۱٬۶۹۹».

Still open on mobile, unchanged and long-standing: **no owner controls at
all** (item 11 below) and **no push infrastructure** (item 13).

### The audit as it stood (24 Aug)

`apps/mobile` was last touched at `d561f1c`. Five web commits have landed
since and **none of them touched the app**:

| Commit | What it added | On mobile? |
|---|---|---|
| `29f222f` | random default listing order, four sorts, filters, 89% featured boost, **Platinum tier** | no |
| `8aae807` | SEO / canonicals / entity graph | n/a — web-only by nature |
| `577ff4e` | **smart search** (LLM query understanding) + announcement search | no |
| `86ded38` | admin settings | n/a — web-only by nature |
| `14e8b23` | lawyer import + admin export | n/a — data, arrives on its own |

**The binary is the bigger gap.** The newest artifact anyone can install is
**APK 1.2.0** (EAS `7d468902`, 16 Aug, commit `c6bd835`). The source has been
at 1.3.0 since `d561f1c`. So the GOPLAZA rebrand — done in code on 18 Aug —
**has never reached a single installed app**. Every phone running it still
says čārana.

**Nothing is broken, which is why this was easy to miss.** `search_businesses`
kept its signature (the smart-search migration only *added*
`search_announcements` and the LLM cache table), and all four new migrations
are additive. The app does not error; it simply shows less than the site.

Code gaps found, in the order they must be fixed:

1. **`features.tsx` hard-codes three plan sections** (`free`/`pro`/`featured`).
   Platinum will not appear even after a rebuild, and any shipped build still
   quotes the old Starter/Premium prices. This is the honesty-rule case: the
   site sells a tier the app denies exists.
2. **The «ویژه» chip does not exist on mobile at all.** `business-card.tsx`
   renders busy status and nothing else, and `CARD_COLUMNS` does not even
   select `plan`/`plan_until`. **The featured boost may not be ported until
   the chip is there** — house rule #2 in `plans.ts` says a paid position must
   be labelled, so a boost without a chip is an unmarked advertisement.
3. **`listBusinesses()` still orders `created_at` desc** — no random default,
   no boost, no `view_count`/`saved_count` sorts, no filter chips.
4. **`listBusinesses()`'s own search path still hand-rolls `ilike`.** The
   search *screen* correctly calls the RPC; this second path does not.
5. **Smart search cannot be called from the app.** `apps/web/lib/search/smart.ts`
   is server-only (service-role client + `OPENAI_API_KEY`). Mobile needs a
   public route under `/api/mobile` carrying the same five gates. Note the
   existing `api.ts` `post()` helper requires a Supabase session and smart
   search must work signed-out, so it needs an unauthenticated helper too.
   `search_announcements` by contrast is a plain RPC the app can call directly.

Baseline `pnpm typecheck` in `apps/mobile` was clean before any of this work.

## ~~`pnpm db:push`~~ — done, 19 Aug

All three pending migrations applied — not via `pnpm db:push` (the CLI kept
hitting its interactive DB-password prompt), but by running each file's SQL
directly in the Supabase Dashboard → SQL Editor. `businesses.saved_count`
confirmed present and backfilled over REST; commit `29f222f` (random-order
`/businesses` + Platinum pricing) pushed to `main` right after.

**Housekeeping, not urgent:** the CLI's own migration-history table may not
know these three ran, since they went in outside `db push`. Next real
`pnpm db:push` might try to re-apply one and hit an "already exists" error —
if so, `npx supabase migration repair --status applied <version>` for that
timestamp, then push again. Not worth doing pre-emptively; deal with it if
it happens. **Now covers five files**: the original three plus
`20260830300000_smart_search.sql` and `20260830310000_settings_and_backups.sql`
(both also applied via SQL Editor, 19–21 Aug).

## Rebrand → GOPLAZA (18 Aug night, branch `rebrand/goplaza`) — Farjad's dashboards

Code is done and verified; production is not GOPLAZA until these are done, in
this order — full detail in `REBRAND_EXTERNAL_ACTIONS.md`:

1. Vercel: add `goplaza.ca` + www, 308 `charana.ca` → `goplaza.ca` path-preserving,
   `NEXT_PUBLIC_BASE_URL=https://goplaza.ca`, check build command has no
   `@charana/web` filter. **Before merging.**
2. Supabase Auth: Site URL + add `goplaza://**`, `https://goplaza.ca/**` to
   Redirect URLs (keep the old ones). `pnpm db:push` for the data migration.
   **Before merging** — mobile signup mail links now use `goplaza://`.
3. Resend: verify `goplaza.ca`, create the mailboxes, then flip `company.ts`.
4. Stripe: rename the two live products; keep metadata keys.
5. Search Console change-of-address; Maps key referrer; X handle.
6. Supply the master vector of the G-mark; run `scripts/generate-brand-assets.mjs`.
7. Decide whether old blog post bodies get «چارانا» → «گوپلازا» (data, not code).
8. ~~Fix the false claim on the auth side panel («+۲۰٬۰۰۰ کسب‌وکار ثبت‌شده»)~~
   — **done, `d561f1c`.** Real counts now come from `lib/data/directory-stats.ts`,
   shared with the home hero; the «نامشخص» sentinel no longer inflates the
   city count (46 → 45 real).
9. `expo prebuild --clean` → build APK **1.3.0** (`app.json` already bumped
   for the rebrand). In the same commit as that build, update
   `apps/web/lib/data/releases.ts`: `APP_VERSION`, `STORES.apkDirect` /
   `apkVersion` / `apkSizeMb` / `apkBuiltAt`, and one new `RELEASES` entry.
   `/download` still advertises 1.2.0 on purpose — it is the only binary that
   exists, and that page is a download promise, not a changelog of intent.

## Farjad — dashboard work, minutes each

**Stripe, before any real charge:**
- **Roll the live secret key** — it was pasted into a chat transcript on 16 Aug
- Settings → Tax → set the head office address (automatic tax fails without it)
- Settings → Billing → enable the Customer Portal
- Create the production webhook endpoint at `https://goplaza.ca/api/stripe/webhook`
  and put its signing secret in Vercel as `STRIPE_WEBHOOK_SECRET`
- Run `scripts/seed-stripe-plans.mts` against live (it refuses live keys by
  design — create the live products deliberately), then set the four
  `STRIPE_PRICE_*` variables on Vercel
- Confirm the account's legal entity: the sidebar reads "Charana / Visa Roads"
  while the site says Ashavid Inc. The account owner is the merchant of record

**Security and config:**
- Rotate the Twilio auth token (pasted into a transcript)
- Remove the unused `GEMINI_API_KEY` from Vercel
- Delete the personal Supabase token from the dashboard
- Change the two temporary admin passwords, then delete
  `apps/web/.admin-credentials.local.txt`
- Point `carana.ca` DNS at Vercel
- Enable the Maps Embed API on the Google key to bring the profile map back

**One click, highest leverage:**
- `/admin/cleanup/cities` → "apply all" sets 365 Toronto-area listings that
  currently have no city. Then work the ~44 rows that need a human.

**Data hygiene, after the seven-directory merge (17 Aug, `2384aa5` → `34185f5`):**
- **Held for review, not inserted** (shares a phone or website with an
  existing row and gpt-4o would not commit): Hamvatan 7, Bazaarche 3,
  Jabeh 9, Taablo 31, FarsiLink 5, re-import 2 ≈ **57**. Each report
  (`hamvatan-import-report.json` and per-source `*.json` reports, regenerate
  with a dry run) lists them with the existing row's slug and the model's
  reason. Merge or add is one admin action each.
- **Inserted despite a shared phone** with the model's stated reason: ≈40
  across sources (in the same reports under `inserted_despite_shared_phone`).
- **Wrong merges already reverted** (51): brokerage/agency platform hosts
  (mortgage.rbc.com, century21.ca, mortgagealliance.com, rightathomerealty,
  royallepage, zil.ink…) and generic names («مشاور املاک» ↔ «مشاور املاک X»).
  Rules fixed in `34185f5`; the reverted rows were re-imported cleanly.
- **~520 new DRAFT rows** with no city from any source (mostly Jabeh
  realtors, whose pages carry no location). They are invisible until a city
  is set. The `/admin/cleanup/cities` area-code pass could place many.
- **Taxonomy gap:** 12 categories, no slot for travel agencies, cargo/moving,
  media, charities/community centres, pet services. They were filed in the
  closest category with the source's own label kept in `sub_category`.
  Decide whether to add categories before the next SEO pass.
- **Bazaarche descriptions were deliberately not imported** — their prose is
  Google-Places boilerplate («X is a Persian/Iranian Gym serving…»). Those
  ~500 rows have name, address, phone, website, hours-less. Taablo rows are
  similarly thin (name, phone, address, category).
- **Logos:** ≈1,990 re-hosted into Supabase storage 17 Aug (jabeh, bazaarche,
  farsilink, iranbusiness). 147 FarsiLink image URLs were dead on their side
  (404 on every size variant) and were set to the placeholder rather than
  left as broken hotlinks. Hamvatan and Taablo rows never had logos. Consider
  a logo pass from each listing's own website OG image later.
- **Ownership fixed 17 Aug:** imported rows were `created_by` the first admin
  profile, so admin@charana.ca's dashboard listed all 5,649. New system
  account `imports@charana.ca` owns them now (`scripts/reassign-imports.mts`,
  `9d1feb3`); Farjad's three showcase listings are `owner_user_id` =
  farjad@ashavid.ca.

**Needs a real device:**
- Test the voice suggestion box on an iPhone (the simulator has no microphone)

**New, 16 Aug — footer currency rates:**
- **Roll the Navasan key** — `free4Bp…` was pasted into the chat on 16 Aug,
  same rule as the Stripe and Twilio keys above. It is a free-tier key
  (120 requests/month), so the blast radius is a quota, not money — but
  rotate it anyway and put the new one in Vercel + `apps/web/.env.local`.
- ~~Set `NAVASAN_API_KEY` in **Vercel**~~ — done; verified 17 Aug by
  reading goplaza.ca's footer, which renders all three rates.
- ~~Check the response shape once a real key exists~~ — done 16 Aug
  (`c85a42b`). Field names are the bare `usd`/`eur`/`cad` keys; a
  3-day staleness guard now drops dead symbols (`cad_cash` was 299 days
  old and 42% off).

## Owner identity on verified profiles (17 Aug, `5f5c03b`)

Shipped. Two things a human should decide, neither of them code:

- **Nobody was told.** The three currently-verified listings are all
  Farjad's, so nothing was published about a stranger today — but the next
  person who verifies gets their profile name printed on a public page with
  no prompt at the moment of verification. Worth adding a line to the claim
  flow and the verification email, or a one-time notice, before the fourth
  verified listing exists.
- **Free and Starter cannot opt out at all.** That is the product decision as
  asked. If someone writes in and wants their name off a Free listing, the
  server action refuses them; an admin has to flip `hide_owner` by hand.
  Decide whether "remove my name on request" should be free for everyone
  (it costs nothing to allow, and refusing it is the kind of thing that gets
  screenshotted).

## Jobs board — BUILT on web 18 Aug

Full spec and what shipped: `09-jobs-board.md`. Four forks decided by Farjad:
only existing listing owners may post; verified businesses publish directly
while everyone else queues; **free and unlimited** (so nothing on the pricing
or features page may present it as a paid perk); jobs only.

**Salary is optional** — Farjad's call on 18 Aug, taken with the Ontario
question still open.

**The description is Markdown** (`c2deb42`), with an AI drafting endpoint at
`/api/ai/job-description`. AI spend is counted in the new `ai_usage` table —
10 drafts per user per 24h — because `lib/utils/rate-limit.ts` resets on
deploy. Not a plan quantity; do not move it into `plans.ts`.

Still open:

- **Farjad, before the board is promoted anywhere:** verify Ontario's 2026
  pay-transparency rules for publicly advertised postings against a primary
  source. If a salary range is mandatory, `salary_min` becomes required in
  the form and NOT NULL in the table — and that migration has to deal with
  whatever was posted without one. Cheapest while the table is empty.
- **One signed-in pass by a human.** The public board, the detail page, the
  `JobPosting` JSON-LD, the expiry rule, the profile section and the
  `job_apply` event were all exercised against real rows. The **owner form**
  and the **admin queue** were only typechecked and reached unauthenticated
  (both correctly refuse) — nobody has posted an ad through the UI yet.
- ~~**Moderation emails**~~ and ~~**expiry nudge**~~ — **done 18 Aug
  (`0e02e9c`)**. `jobModeratedEmail` fires from `moderateJob`; the nudge runs
  from a new cron at `/api/cron/job-expiry-reminders`, 13:30 UTC daily.
  **No real email has been sent yet** — both templates were rendered and
  checked, and the cron's selection, idempotency and extend-reset were
  verified against real rows, but nothing was actually delivered. Fire one:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://goplaza.ca/api/cron/job-expiry-reminders`
- ~~**Mobile**~~ — **done 18 Aug (`6c1084f`)**: board, detail, home rail,
  profile section, account row. Read-only; posting stays on web with the rest
  of the owner controls.
- **`.prose-fa` list markers** — the blog has the same Tailwind-preflight bug
  that `.job-md` just fixed: `list-style: none` means its `li::marker` colour
  rules have never rendered. One line in `globals.css`.
- `/jobs/[slug]` returns **200 on a missing or expired post**, not 404. Same
  pre-existing streaming/`notFound()` issue as the city routes (below), but it
  matters more here: Google treats a soft-404 on a `JobPosting` URL as a
  quality problem. Worth fixing before the board has real traffic.

## Blocked on something external

- D-U-N-S for Ashavid Inc. → Apple Developer and Google Play organisations →
  App Store / TestFlight → store screenshots

## Code — next slices, in order

1. ~~**APK 1.2.0**~~ — **shipped 16 Aug, `229669c`** (EAS build
   `7d468902`, 110MB). Carries the blog, conversion events, the report
   sheet, the voice suggestion box, busy-status display, the Tehran
   clock/FX card and the announcement surfaces.
   **Found in the process: APK 1.1.0 was broken the whole time it was
   linked** — no `EXPO_PUBLIC_SUPABASE_*` reached the build, so the app
   threw on launch. Fixed by adding them as EAS project variables; see the
   gotcha in `06-gotchas.md`. **Still unverified: nobody has run 1.2.0 on
   a real Android device or emulator** — the credentials are confirmed
   inlined in the bundle, but that is static evidence only. Install it
   once before promoting it anywhere.
2. **Blog E-E-A-T pass.** Two or three first-hand sentences per post that a
   model cannot invent. Farjad supplies; I fold in.
3. RLS and authorization regression tests.
4. Rate limiting to shared infrastructure — it is per-instance memory today, so
   it resets on every deploy and does not hold across regions.
5. Anti-scraping for the directory.
6. `businesses.category` is free text, not a foreign key; category labels have
   two sources of truth.
7. `notFound()` in the city routes returns 200 (pre-existing, cosmetic —
   the body is noindex).

Featured placement is now fully backed: city × category, `/cities/[slug]`,
`/search`, and (16 Aug) the home page's `homepage_slot` section all sort and
label it. The section on `/` only renders when a business actually holds an
active Featured plan — today that's nobody, so it's correctly invisible.

## Plans v2 backlog (16 Aug brainstorm, tracked in Notion Mission Control)

An audit found most of the old Pro plan's bullets were sold but not built.
Renamed Pro → استارتر (Starter), Featured → پریمیوم (Premium) — display
names only, `PlanId` unchanged (`lib/billing/plans.ts`). **Shipped:** tiered
gallery — free 3 photos, Starter 5 + 1 video, Premium unlimited, enforced
server-side (`e6071c5`). **Not built yet, in priority-ish order:**

1. ~~Announcements~~ — **shipped 16 Aug, `86e85e4`.** Free 1 / Starter 3 /
   Premium unlimited, over a rolling 30 days. `business_announcements`
   table, no client-side RLS write policy at all — quota needs
   `entitlementsFor()` plus a count query, not a row check, so
   `lib/actions/announcements.ts` is the only writer. New dashboard page
   at `/dashboard/business/[id]/announcements`; active ones render in a
   banner on the public profile.
2. ~~Review replies (Starter)~~ — **shipped 16 Aug, `d5625e5`.**
   `public_reviews.owner_reply`, written through a server action (no RLS
   policy lets an owner update someone else's review row, so the action is
   the gate), rendered publicly under the review with inline write/edit/
   delete for an entitled owner.
3. ~~"Busy now / quiet now" live status toggle (Starter)~~ — **shipped 16
   Aug, `ac00070`.** Self-expiring (4h), toggled from the owner dashboard,
   shown on `BusinessCard` everywhere and the profile hero.
4. ~~Vanity English URL~~ — **shipped 16 Aug, `9451290`.**
   `charana.ca/b/[slug]`, English-slugged from day one, 301s to the real
   profile (an alias, not a second indexable page). Case-insensitive
   unique index; format + entitlement checked in
   `lib/actions/vanity-url.ts`. Does not touch the wider Persian-slug
   retrofit noted further down.
5. Personalized targeted search suggestion — e.g. an "Iranian restaurant"
   search surfaces a Premium business as a custom suggestion.
6. Real in-app booking calendar replacing the external `booking_url` link,
   with SMS lead notification (Premium) — reuses the existing Twilio
   integration.
7. Monthly AI-generated blog article per Premium business + backlink —
   reuses `lib/blog/generate.ts`, the engine already exists.
8. Suppress the "similar businesses nearby" block on a business's own
   profile (Premium) — right now every profile advertises its competitors.
9. QR / short link with UTM-style source tracking in owner insights
   (Premium) — reuses `business_events`.
10. Real multi-branch UI with a map (Premium) — the `branches` column exists
    on `businesses` already but has no UI, same class of gap as the earlier
    `is_featured` dead-code bug.
11. Mobile owner-management screens (gallery parity included) —
    `apps/mobile` still has no edit/insights/billing/announcement-*writing*
    at all. What has reached mobile is the **read** side: busy-status
    display (`76f8f27`), announcements in three surfaces + the «باخبرم کن»
    follow toggle (`6aaf06e`), the FX/clock card (`5046d9a`) and the
    features screen (`8540df1`). Owner *controls* — the busy toggle,
    gallery upload, posting an announcement — stay web-only until there is
    somewhere on mobile to put them. This is the single biggest remaining
    mobile gap.
12. SMS announcement notifications — a third channel for the
    announcement-follow system (item 13 below); costs real money per
    message via the existing Twilio integration, needs a budget/UX
    decision from Farjad before it's an engineering task.
13. Push notification infrastructure (mobile) — no Expo push token
    registration or device-token storage exists at all; a bigger
    prerequisite than any one feature that would use it.
14. Website price list extraction (Premium) — Farjad's idea: reuse the
    existing AI website-scrape (`scrapeWebsiteForBusiness`, already used at
    onboarding) to pull a structured price list from a business's own site
    instead of the free-text services list. Scope not yet defined.

**Cross-cutting finding, not tied to a plan:** business profile and blog
post URLs are Persian-language slugs today (`packages/core/src/slug.ts`
deliberately keeps the Persian/Arabic Unicode range) — this contradicts a
new standing rule ("all URLs must be English"). Affects ~680 indexed
business URLs and every blog post URL; fixing it site-wide needs 301
redirects to keep the SEO built up over the last few weeks. Bigger and
separate from item 4 above, which should just be English from the start.

## Features page (16 Aug, `016c8f8` web / `8540df1` mobile)

`/features` on web and a native screen on mobile, both reading plan
quantities from `@goplaza/core` so they cannot drift from what the server
clamps. Both carry a "چیزهایی که هنوز نداریم" section listing everything
audited as absent — removing it is what would make the rest untrustworthy.
`plans.ts` moved into `@goplaza/core` for this (fourth module to make that
move); `apps/web/lib/billing/plans.ts` is now a re-export.

## Announcement discovery (16 Aug, `ac3cef6`)

Shipped: homepage feed (10 newest sitewide) + opt-in follow-and-email via
`user_business_interactions.notify_announcements`, new "اعلان‌ها" tab on
`/profile/interactions`. Not built this pass, tracked above as items 12–13:
SMS (costs money, needs a budget call) and push (mobile has zero
notification infrastructure to send to).

## Review moderation (17 Aug, `5c80228`)

Shipped: moderation-outcome email to the reviewer (carrying the moderator's
reason on reject/needs-changes), new-review email to the owner (which does
not offer a reply button the plan refuses), and server-side guards — 5 new
reviews per user per rolling 24h counted in the database, 10–2000 chars,
integer 1–5 rating, and no reviewing a business you own.

**Three product questions deliberately left open** — nothing was built on a
guess:

1. Does moderation stay fully manual? It works at zero reviews; it does not
   work at fifty a day. Options discussed: keep manual, auto-publish with
   post-review, or auto-publish for verified users only.
2. Should writing a review require a verified email/phone, or having marked
   the business «رفتم»?
3. Should a business be able to contest a review it believes is unfair?
   Today it can only reply.

**Not verified:** the one line inside `moderateReview` that calls the
notifier. Delivery itself was tested for real (both mails sent via Resend,
test review deleted after); exercising the call site needs an admin session.

## Header CSS bug + Tehran clock/rates (16 Aug, `256876c` / `ea375fb`)

- Fixed a real bug Farjad noticed but couldn't name: `globals.css` had two
  full `.site-header` definitions, one from before the 2026-08-23 header
  rebuild. The old one leaked padding/margin/border-radius/box-shadow
  through at every width and killed `position: sticky` below 720px. See
  the gotcha in `06-gotchas.md`.
- Footer now shows Tehran time + Jalali + Shahanshahi date (web and app,
  shared conversion in `@goplaza/core`), plus a real free-market USD/EUR/
  CAD line via Navasan once `NAVASAN_API_KEY` is set (see Farjad's action
  items above) — absent, not fabricated, until then.

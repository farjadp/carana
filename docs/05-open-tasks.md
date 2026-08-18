# Open tasks

**Updated:** 2026-08-17, end of the 15–17 Aug session.
The live board is Notion → 🧿 Charana → Mission Control; this is the narrative.

## Farjad — dashboard work, minutes each

**Stripe, before any real charge:**
- **Roll the live secret key** — it was pasted into a chat transcript on 16 Aug
- Settings → Tax → set the head office address (automatic tax fails without it)
- Settings → Billing → enable the Customer Portal
- Create the production webhook endpoint at `https://charana.ca/api/stripe/webhook`
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
- Hamvatan and Taablo rows have the placeholder logo (those sources have
  none). Consider a logo pass from each listing's own website OG image later.

**Needs a real device:**
- Test the voice suggestion box on an iPhone (the simulator has no microphone)

**New, 16 Aug — footer currency rates:**
- **Roll the Navasan key** — `free4Bp…` was pasted into the chat on 16 Aug,
  same rule as the Stripe and Twilio keys above. It is a free-tier key
  (120 requests/month), so the blast radius is a quota, not money — but
  rotate it anyway and put the new one in Vercel + `apps/web/.env.local`.
- ~~Set `NAVASAN_API_KEY` in **Vercel**~~ — done; verified 17 Aug by
  reading charana.ca's footer, which renders all three rates.
- ~~Check the response shape once a real key exists~~ — done 16 Aug
  (`c85a42b`). Field names are the bare `usd`/`eur`/`cad` keys; a
  3-day staleness guard now drops dead symbols (`cad_cash` was 299 days
  old and 42% off).

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
quantities from `@charana/core` so they cannot drift from what the server
clamps. Both carry a "چیزهایی که هنوز نداریم" section listing everything
audited as absent — removing it is what would make the rest untrustworthy.
`plans.ts` moved into `@charana/core` for this (fourth module to make that
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
  shared conversion in `@charana/core`), plus a real free-market USD/EUR/
  CAD line via Navasan once `NAVASAN_API_KEY` is set (see Farjad's action
  items above) — absent, not fabricated, until then.

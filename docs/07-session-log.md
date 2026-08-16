# Session log — 2026-08-23/24

14 commits, from a codebase that would not build to a live site.


## 15–16 August 2026 — search follow-through, SEO layer, blog, money

A long session, roughly in this order.

**Suggestion box.** Text or voice, no sign-in, on the home page, `/support` and
the zero-result search; the same box in the app via `expo-audio`; an admin
inbox with signed-URL playback.

**Search, properly fixed.** «رستوران in Toronto» returned nothing because the
filter was `lower(city) = 'toronto'` and every restaurant sits in North York,
Richmond Hill or «نامشخص». Added `city_metro` and `category_aliases` and made
the RPC expand through both; the search page now widens the query when a city
filter finds nothing and says so.

**SEO/GEO layer 1.** City × category pages with live counts, data-derived FAQ
and full structured data; `llms.txt`; interlinking; pagination on every long
list. Two old bugs fell out: city counters were computed from a 24-row page,
and the city search form submitted nowhere.

**Cities and 404.** Every city resolves now, not just the eight configured
ones. The index was redesigned and the 404 rebuilt around a real search box.

**Blog.** Tables, seven categories, a generator anchored to the directory's own
data (counts, zero-result searches, suggestions, the calendar), a humanising
pass, brand imagery through fal.ai, an admin desk, public pages, RSS — and the
same blog inside the app with a hand-written markdown renderer.

**Report button, conversion events, owner insights, city cleanup queue,** and
live admin sidebar counts.

**Billing.** Stripe subscriptions end to end in sandbox: plans in code,
checkout with server-side ownership and price selection, a signature-verified
idempotent webhook, invoices, `/pricing`, and entitlements that recompute from
`plan_until` rather than trusting the stored plan.

**Docs.** Fifteen files merged into eight, a root `CLAUDE.md` added, and both
mirrored into Notion with a durable revision log.

### What I said wrongly

- Reported the app's **tab bar as unresponsive** and started looking for a bug.
  It was fine: the simulator tool takes device points (402×874) and I was
  feeding it screenshot pixels. Nothing was broken.
- Published five first-generation blog posts before checking them properly; one
  stated a Canada-wide number («۶۸۰») as a Vancouver number, live on the site.
  Unpublished, prompts fixed, replacements generated.
- Left `EXPO_PUBLIC_API_URL` pointing at my laptop's LAN address in
  `apps/mobile/.env.local` after testing. Harmless locally, but `EXPO_PUBLIC_*`
  is inlined at build time, so an APK built from that checkout would have
  shipped pointing at 192.168.1.211.
- Twice told Farjad production was healthy while `/profile`, `/admin` and every
  `/api/mobile/*` route were failing on empty Sensitive environment variables.
  The site rendered, so I believed it. Only the runtime log told the truth.

## 16 August, continued — featured placement renders (`8580d7a`)

The honesty gap flagged at the end of the last session: `sortFeaturedFirst`
and the `featured_placement` entitlement existed, nothing called either, and
`/cities/[slug]` still had a dead `is_featured` chip reading a column that
was never selected (same bug class as the gotchas doc's "a badge that could
never render" — different file, same mistake).

- `BusinessCard` now computes `featured` itself, via `entitlementsFor` on
  `plan`/`plan_until`, and renders the «ویژه» chip — one place, so every
  surface that uses the card gets it without remembering to wire it up.
- `lib/seo/local.ts` (city × category) and `/cities/[slug]` both sort
  featured-first now, ahead of verified-first.
- `search_businesses` needed a real migration, not a client-side sort: it
  paginates in SQL, so featured-first has to be decided before `limit`/
  `offset` or a featured row on page 2 would never outrank a free row on
  page 1. Added `plan`, `plan_until` to its return row and `is_featured desc`
  ahead of `rank desc` in the `order by`. `create or replace` refused to add
  columns to an existing function's OUT parameters (`42P13`) — needed an
  explicit `drop function` first, in the same migration.
- Pushed with `supabase db push` against the linked project, then
  `pnpm gen:types` to keep `database.types.ts` current — verified against the
  gotcha two entries below this one.
- Verified in the browser: no chip renders anywhere yet, correctly — nobody
  holds an active Featured plan, so an absent chip is the honest state.

**Still open, written up in `05-open-tasks.md`:** the pricing page promises
a home page "ویژه" section (`homepage_slot`) that nothing renders yet. Don't
let that plan sell it until it exists.

## Commits, oldest first

```
 1. 63edb79 Harden authorization, fix the build, and sync migration history
 2. 1b36fdb Convert to a Turborepo monorepo and add the Expo mobile app
 3. 89933ea Import the directory, rebuild the mobile app, redraw the category art
 4. 79a6cdd Repair category image paths broken by the artwork swap
 5. b3c3497 Add the pages the App Store requires and fix outstanding web defects
 6. 49ea0e5 Browse by province, re-host imported logos, and add the app icon
 7. 16075d0 Fix the Vercel build: declare env in turbo.json, derive the base URL
 8. 3e01141 Promote the Supabase URL and publishable key into the client bundle
 9. ec98681 Fail the build early and say exactly which Supabase variables are missing
10. e03e28c Use Vercel's standard monorepo layout instead of hand-wired build paths
11. 2b4ae59 Resolve the domain redirect loop; charana.ca is canonical
12. 1ea3d37 Rebuild the site header and add the missing /businesses index
13. d39c4a4 Add the native iOS project so the app can run on a real device
```

## What changed, in order

**Review.** Read the whole solution — 11 migrations, every server action, API
route, and the auth layer. Found a hard-coded `SUPABASE_SECRET_KEY` in four
repo-root scripts, a privilege-escalation path to `admin` through signup, and
a production build that had never succeeded.

**Phase 0.** Rotated and revoked the leaked key. Moved authorization into RLS.
Fixed the build. Discovered the Supabase migration history was empty while the
schema had been applied by hand, repaired it, and found two migrations that had
never run at all.

**Mobile strategy.** Settled on Expo over native and Flutter; established that
featured listings sold to business owners are a B2B advertising service and sit
outside Apple's in-app-purchase rules, provided the purchase stays on the web.

**Monorepo.** Converted to Turborepo. Next.js moved to `apps/web` unchanged;
`packages/core` took the generated database types, the Zod schemas and the
listing state machine. Scaffolded `apps/mobile` with Expo Router.

**Import.** 676 listings from a scraped CSV. The parser and the AI categoriser
were fine; the field mapping was not — it would have published a competing
directory as each business's website, and collapsed every Persian name to the
slug `business`.

**Change review.** Edits to a live listing now run through a classifier:
deterministic rules for identity and trust fields, an AI check for free text
and links, immediate publication for operational fields. Fails closed. RLS
forbids owners from updating a published row, so the classifier cannot be
skipped.

**App Store readiness.** Real privacy policy and terms — both had been
placeholder text. Self-service account deletion, which Guideline 5.1.1(v)
requires and whose absence means rejection. A support page. Real company
identity throughout.

**Deployment.** Four separate causes, in sequence: Turborepo stripping
undeclared environment variables; a base-URL guard that failed the build it was
meant to protect; `NEXT_PUBLIC_*` inlining; and Vercel dashboard overrides
that beat the repo. Then a redirect loop between apex and www. Live at
charana.ca.

**Province hierarchy.** Geography is province → city on both platforms, which
gave the 409 city-less listings somewhere to live. 618 logos moved off the
source server onto our own storage.

**Header.** The main nav linked to a page that 404'd and hid itself entirely
below the `md` breakpoint with no replacement — no navigation at all on a
phone, for a local directory. Rebuilt with a real mobile menu and active state,
and built the missing `/businesses` index.

**Native iOS.** Expo Go on the App Store is pinned at SDK 54; the project is 57.
Prepared a development build: entitlement stripping for free signing, the
CocoaPods locale fix, and the Xcode project naming. Device install not finished.

## What I got wrong

**Category artwork, twice.** The first set used a pointed arch and an
eight-pointed shamseh — Islamic architecture, not Iranian identity. The second
was better but the illustration was still weak. Hand-coding SVG path data works
for geometry and badly for pictures. The right answer was to use a professional
icon set, which took two rejections to reach.

**The logo is still a placeholder.** Worth paying a designer; brief is in
`01-product.md`.

**Told you the original logos were not imported.** They were — 621 of them,
hotlinked. Corrected in the same session and since re-hosted.

**Trusted `api.expo.dev` over the App Store** on which Expo Go version exists.
Your screenshot was right.

---

# Session: 2026-08-14 (the long one)

One conversation, morning to evening. The theme that emerged: **silent
failure** — things that report success while doing nothing.

## Infrastructure

- **Auto-deploy had been dead a day.** Every git push failed on a `"//"` key
  in `vercel.json` (the Git integration validates strictly; the CLI does
  not). Production was quietly running from laptop deploys. Fixed; pipeline
  since verified over many pushes.
- Farjad set Twilio + Resend env vars; email and SMS became real.
- Sentry was added, then **removed the same day** (price) and replaced with
  first-party telemetry: `system_errors` (quiet failures via
  `reportQuietFailure`) and `cron_runs` (heartbeat by presence — a job that
  stops running writes nothing, so success is recorded too).
- Vercel Web Analytics (cookieless, no consent banner needed); Search
  Console registered by Farjad. GA rejected deliberately: cookie wall on a
  trust product.

## The verification system (core of the day)

Two paths: `self_onboarded` (own email+phone proven) and `claimed` — SMS to
the number **already published on the listing**; the claimant never chooses
the destination, receiving the code *is* the proof. 182-day expiry; renewal
re-runs the original proof; countdown public only in the last 30 days
(owners always see it). Editing the proven phone/email **voids** the badge
(`superseded`), with Persian-digit folding so RTL input doesn't void itself.
`/claim` route built — it had linked to a 404 on every unclaimed profile.
Reminder cron at 30/7/0 days, stage-bucketed so it can't nag; refuses to run
without `CRON_SECRET` (unset — the remaining blocker).

## Honesty purge

Found and removed a family of UI lies: the home page called all 677 imported
listings "تایید شده" with an **unconditional** chip under a heading claiming
team review; category/city cards read `is_verified`, a column in no
migration; the fallback category FAQ claimed "all reviewed"; "most visited"
sorted by nonexistent `view_count` (section could never render — now backed
by a real counter + `increment_business_view`); the report button still
lies (open task). Rule recorded in 00-START-HERE.

## Home page + imagery

Home rebuilt as a discovery surface: shared `BusinessCard` (whole card is
the link, CTA «دیدن اطلاعات و تماس»), newest + most-visited sections, city
cards with generated blue-hour photos, app section with a **live miniature
of the real app UI** (first version — dead phone on wallpaper — rejected),
nav decluttered. Category art: after 4 failed art directions (icon clichés →
unreadable medallions → pixel edges → photography too stock), landed on
editorial object photography, Iranian identity in art direction not
subjects. 12 categories + 8 cities, one campaign, WebP (24 MB → <1 MB).
Scripts in `scripts/generate-*.py` with locked SYSTEM blocks.

## Mobile

Phone build unblocked through the full error chain: signing (Apple ID),
**iOS platform download** (the "ineligible destination" trap — gotcha
recorded), react-native-svg 15.13→15.15.4 (Fabric API mismatch), prebuild,
Developer Mode. **App now runs on Farjad's iPhone.** First real signup
exposed the auth-email chain (junk / "Supabase Auth" / English / localhost
link) → `charana://auth/confirmed` deep-link welcome screen built; RTL
branded templates written (`docs/13`); dashboard settings documented and
waiting on Farjad.

## Process

Notion Mission Control became the operational board: ~50 missions, `Hands`
column (Farjad/Claude/Both), per-task instructions for every Farjad-owned
card, Done log backfilled from the whole git history. Standing rule in
memory: all work is recorded there.

## What I got wrong today

- Audited the badge system across profile/category/city surfaces and
  declared it clean — **without checking the home page**, which was the one
  surface lying. Lesson recorded: enumerate from sitemap.xml.
- Called the deploy pipeline broken when it was merely slow; the empty
  re-trigger commit was unnecessary.
- Four rounds of image art direction rejected before understanding the
  actual requirement (identity in direction, not in subjects).
- Left the events section's `view_count` assumption unverified for hours
  while it silently rendered nothing.

---

# 2026-08-15 — search, registration everywhere, the pages, the polish

Longest day so far. Theme: **finish the promises** — every link goes
somewhere, every number is real, every flow works end to end on both apps.

## Morning: mobile brand + Android
- Mobile app redesigned around the brand (Vazirmatn, Hidden Č, merlon,
  soft elevation). Found a v1 bug on the way: `Link asChild` had silently
  dropped the business card's function-style, so the card never had a
  surface. Stale-Metro trap recorded.
- eas-cli installed; Farjad's expo.dev login; `owner: ashavid`; first
  Android APK (1.0.0), then 1.1.0 at night. `ANDROID_SHA256_FINGERPRINT`
  extracted from the APK's v2 signing block, set on Vercel, assetlinks live.

## Supabase session — done via the Management API, no dashboard
- Site URL, redirect allow-list incl. `charana://**`, Resend SMTP, four
  Persian templates. Free-tier gotcha: templates lock until SMTP exists.
  Verified with a real signup: Resend "delivered" one second later.
- Vercel Sensitive env vars pull as empty strings — not a misconfiguration.

## Registration with AI website import
- Web: step zero "shall we read this from your website?" → extractor
  (multi-page, hrefs mined, JSON-LD, category suggestion, per-field
  confidence) → prefill → per-step banners → review. Honesty guards: no
  invented hours / year / "serves in Persian"; translated fields always
  flagged. Model tried to fabricate 9–18 hours; now hours need a time
  pattern in the page text.
- Mobile: full owner journey (gate → verify → import → 7 steps → submit)
  on three new Bearer-auth API routes; contact-code logic extracted to a
  shared module. Draft awaited → one row per session.
- Farjad decided mobile carries the owner journey (Notion decision closed).

## Profiles, hero, pages
- Business profile redesigned on web + mobile (cover, badge, open-now,
  actions, services, hours, contact rows, trust); verification status moved
  to `@charana/core` — subpath export broke Turbopack, re-exported from root.
- Home hero: brand wash, live counters, real search. About / Team / Roadmap
  / Releases / Download / Contact / Support written for real; About
  dropdown; `lib/data/releases.ts` as the single source for stores/APK.
- Claim flow: bare `/claim` = find-your-business; 3-step prove page;
  Persian-digit-safe code (the old `\D` strip rejected ۱۲۳۴۵۶); success state.
- Farjad's three businesses seeded as verified showcase listings; his
  personal + admin accounts created; Persian messages for every auth error.
- Five-digit `ref_no` on every business (trigger + backfill).

## Search (the P0), night
- `fa_normalize`, `search_text` blob + trigram GIN, `search_businesses` RPC
  (ranked, multi-word, typo-tolerant, verified boost), `city_aliases`,
  `search_queries` log, and **keyboard-layout forgiveness** — discovered live
  when the simulator's Persian keyboard turned `dental` into `یثدفشم`.
- `/search`, header field, hero, mobile tab all on the one RPC.

## Bugs found and fixed in passing
- Admin listings page had been blank for a day: two FKs to `profiles`
  (PGRST201) failed the whole query and the page showed "no businesses".
  Now disambiguated and errors are rendered, not swallowed.
- Auth-form import order, Turbopack cache ghosts, `Link` with `mailto:`.

## What I got wrong today
- Briefly reported Vercel secrets as "empty" — they were Sensitive; retracted.
- Sent a password-reset with the wrong redirect path once; re-sent.
- Insisted on a screenshot tool that greyed out `/contact` while the DOM was
  fine — should have trusted the server-side check sooner.
- Nearly hard-coded a mis-mapped keyboard layout (m→ئ); fixed with the ISIRI
  table before shipping.

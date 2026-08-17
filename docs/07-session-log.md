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

## 16 August, still continued — the homepage slot too

Closed the gap noted above the same session: `/` now has a «ویژه» section
(`app/page.tsx`), fetched with the same expiry rule as `entitlementsFor`
(`plan = 'featured' and (plan_until is null or plan_until >= now())`) and
gated on `featuredBusinesses.length > 0` — an empty version of the section
would have been the exact violation this whole slice existed to fix. Verified
in the browser: it doesn't render today, correctly, because no business holds
an active Featured plan yet. Featured placement is now backed everywhere the
pricing page claims it is.

## 16 August, one more slice — plans v2, gallery ships (`e6071c5`)

Farjad asked to audit "the packages" next. Same class of bug as Featured,
worse: of Pro's 6 sold bullets, only `insights_full` was real. Gallery,
announcements and review replies didn't exist in the DB at all; booking_link
was built but free for everyone, not Pro-exclusive as sold; priority_support
was never a coding task to begin with.

Brainstormed a Free/Starter/Premium structure with Farjad (I proposed data-
driven ideas — missed-search-terms reports, competitor-block suppression on
your own profile, QR-tracked links — reusing infra already in the codebase;
he proposed tiered gallery/announcements, a vanity URL, and personalized
search suggestions). Landed on 11 features across the two paid tiers plus
one cross-cutting finding (business/blog slugs are Persian, not English —
a new standing rule; fixing that site-wide is separate, bigger work than
just building new features English-slugged from day one).

Shipped the first one end to end this session: **tiered gallery.**
`GALLERY_LIMITS`/`ANNOUNCEMENT_LIMITS` in `lib/billing/plans.ts` (quantities,
not booleans — every tier gets *some* gallery, paid tiers get more);
`gallery_urls`/`gallery_video_url` columns; `GalleryUploader` component;
wired into the edit form's media step; rendered on the public profile only
when non-empty. The cap is enforced twice on purpose — the uploader disables
past the limit (convenience), and `actions.ts` clamps the array server-side
against the *existing* row's plan before writing (the actual gate) — the
same "a UI check is not a gate" rule as everywhere else in billing.

Renamed the product-facing tier names (Pro → استارتر, Featured → پریمیوم)
without touching `PlanId` — it's the Stripe env var suffix, the DB check
constraint, and what `sortFeaturedFirst`/the webhook compare against.
Renaming the internal id for a label change would have touched all three for
no reason.

Everything else from the brainstorm (announcements, review replies, vanity
URLs, personalized suggestions, real in-app booking, the AI blog-article
perk, competitor-block suppression, QR tracking, real multi-branch UI, the
Persian-slug finding, and mobile gallery parity) is written up in
`05-open-tasks.md` — not built this session. Eleven items is more than one
slice; said so rather than half-building several. **Notion Mission Control
was not updated for this list** — the connector returned 503 on every call,
including a bare identity check, on two separate attempts with pauses
between retries. Service-side outage, not a query problem; retry once it's
confirmed healthy (open-tasks.md is the durable record in the meantime).

## 16 August, one more slice — review replies ship (`d5625e5`)

Second item off the plans-v2 backlog above, same session: business owners on
Starter+ can now publicly reply to a review on their own profile.
`public_reviews.owner_reply`/`owner_reply_at`, written through
`replyToReview` in `lib/actions/interactions.ts`. Deliberately did **not**
add an RLS policy letting an owner UPDATE someone else's review row — the
server action re-proves ownership of the business and rechecks
`entitlementsFor(business).has("review_replies")` (recomputed from
plan/plan_until, not the stored column) before writing via the service
role. An owner on a lower plan sees an upsell line under the review
instead of a mysteriously missing button.

Notion Mission Control finally reachable again a bit later this same
session — connector needed re-authorization (a different failure mode than
the earlier 503s, which were a genuine outage; five attempts total across
the two causes). Wrote up all 13 backlog items from the plans-v2 brainstorm
in one pass once it was back: the 2 shipped so far marked Done with commit
hashes, the Persian-slug finding at P1, the rest at P2/P3. See Mission
Control, area "Product" — `docs/05-open-tasks.md` stays the durable local
copy either way.

## 16 August, one more slice — busy now / quiet now ships (`ac00070`)

Third item off the backlog: a manual, self-expiring (4h) "الان شلوغیم /
خلوته" toggle for Starter+ owners, on the dashboard. Shows on every
`BusinessCard` (search, city pages, home — one place decides it, same as
the featured chip) and the profile hero. `businesses.busy_status` /
`busy_status_until`; expiry checked in `lib/business/live-status.ts`, never
trusted past its own timestamp, same pattern as `verified_until` and
`plan_until`. `search_businesses` needed a third drop+recreate (same
OUT-parameter constraint discovered two migrations back) to pass the new
columns through paginated results.

## 16 August, last slice tonight — announcements ship (`86e85e4`)

Fourth item off the backlog: owners post a discount/event/news line to
their profile, capped by plan (free 1, Starter 3, Premium unlimited) over a
rolling 30 days rather than the calendar month the pricing copy implies —
deliberate, so there is no reset job and no edge case around the last day
of a month. `business_announcements` has no client-facing insert/update/
delete RLS policy at all: the quota needs `entitlementsFor()` plus a count
query, which RLS can't express, so `lib/actions/announcements.ts` is the
only writer, via the service role. New dashboard sub-page shows the quota
up front; the create form disables past it with an inline upgrade link
instead of letting the submit fail. Active (non-expired) ones render in a
banner on the public profile, absent entirely otherwise.

Found and fixed in passing: `isOwnerOrAdmin` on the public profile page
only checked `created_by`, never `owner_user_id` — a claimed listing's real
owner has been unable to see any owner-only control (including today's
review-reply feature) on their own profile since that feature shipped
earlier tonight. Two-line fix, written up as a gotcha (same "silently wrong
for a case nobody tests" shape as the earlier `is_featured` dead code).

## 16 August, actually last slice — busy status reaches mobile (`76f8f27`)

Farjad asked for the busy/quiet status on mobile too. Moved
`activeBusyStatus`/`BUSY_STATUS_HOURS` into `@charana/core` first (same
move verification status made earlier this project) so both apps read one
expiry rule instead of risking two copies drifting apart;
`lib/business/live-status.ts` in `apps/web` is now a re-export, not a
second definition. Mobile's `BusinessCard` type, list card, and detail
screen all got the chip — reusing the detail screen's existing
`verifiedChip` pill shape with the status colour rather than inventing a
new one.

Said plainly rather than silently narrowing scope: mobile has no
owner-management screens at all yet — no edit, insights, billing, or
announcements, only registration and the public-facing views. So this
ships the half every visitor sees; the toggle itself has nowhere to live on
mobile until that gap closes (tracked as open-tasks item 12). Verified with
`tsc` on both `apps/mobile` and `apps/web` (clean); did not rebuild and
reload in the simulator this pass — the simulator had an older build
already running, and reloading it to exercise a JSX-only change that
mirrors an already-shipped pattern didn't seem worth the cycle, but noting
that plainly rather than implying a device check happened.

## 16 August, one more — vanity URL ships (`9451290`)

Fifth item off the backlog: Premium businesses can set
`charana.ca/b/[english-slug]`. Built English-slugged from day one, on
purpose — this is exactly the kind of new URL the standing "all URLs must
be English" rule exists for, and it does not touch or depend on the wider
retrofit that the existing Persian business/blog slugs still need.
`app/b/[slug]/route.ts` 301s to the real `/businesses/[slug]` profile
rather than rendering a second page, so there's still only one indexable
URL per business — verified live: an unknown vanity slug correctly redirects
through to `/businesses` (dev server had died between browser-verification
attempts this session; restarted it, then confirmed). Case-insensitive
uniqueness via a `lower(vanity_slug)` index, since a naive constraint would
let `Dr-Ahmadi` and `dr-ahmadi` collide invisibly. `setVanitySlug` turns a
raw Postgres `23505` unique-violation into a Persian message instead of
leaking the constraint name — small thing, but a raw pg error surfacing in
a save-toast is exactly the kind of rough edge this project keeps catching.

## 16 August, closing slice — announcements can actually be found (`ac3cef6`)

Farjad's question, paraphrased: a business posts an announcement — how
does anyone find out? Two modes, as he framed it: newest announcements on
the home page (max 10), and a user picking a specific business to follow,
notified by email, SMS, push, or in their own panel.

Built the first two channels, deliberately not the other two:

- **Homepage feed** — up to 10 newest active announcements sitewide,
  absent when there are none.
- **Follow + email + in-app panel** — reused `user_business_interactions`
  rather than a new table (a user already "saves" a business there; RLS
  already lets them read/write only their own rows, no service-role gate
  needed for the toggle itself). Added `notify_announcements`, defaulted
  **false** — "saved" already means something else, and defaulting it to
  "email me" would have been an unannounced email nobody asked for. New
  "باخبرم کن" button in `InteractionBar`, separate from "ذخیره". New
  "اعلان‌ها" tab on `/profile/interactions`. `createAnnouncement` fires a
  best-effort, non-blocking `notifyFollowers()` after the insert succeeds
  via the existing Resend setup.

**SMS and push, explicitly not built, said plainly rather than silently
dropped:** SMS costs real per-message money through the existing Twilio
integration and needs a budget/opt-in decision from Farjad first, not just
an engineering slice. Push has no infrastructure to build on at all —
`apps/mobile` has never registered an Expo push token or stored a device
token, for this or anything else. Both written up as their own Notion
backlog items rather than folded into "later."

Also captured two more ideas Farjad wants tracked, not built this
session: a website price-list extraction feature (reusing the existing AI
scrape used at onboarding) and confirmation that real in-app booking was
already tracked from the earlier brainstorm.

Verified: `tsc` + build clean. The one part that couldn't be checked purely
by type-checking — the PostgREST embedded-filter syntax
(`businesses!inner` + `business.status=in.(...)`) for the homepage
query — was confirmed with a direct REST call against the live database,
since a wrong embed-filter string compiles fine and just silently returns
the wrong rows. Did not fabricate a test announcement to screenshot the
populated feed/email — that would mean writing throwaway content into
production data — so the full populated-state render path is unverified
by eye, only by code review and the isolated query check.

## 16 August, actually closing — Farjad asked, so a test row went in and came back out (`ac3cef6` render check)

Farjad asked directly for the thing noted as unverified above: create a
test announcement and delete it. Did exactly that — a temp Node script
using the service-role key (outside the repo, in the scratchpad), created
one row on Ashavid, confirmed it live in the browser on both the homepage
feed and the profile banner via `read_page` (screenshots were unreliable
this session, see below), then deleted it and re-queried to confirm zero
rows left. No repo files touched, nothing committed — this was a
verification pass, not a feature.

**A pattern worth naming:** the Browser pane's `navigate` call reported
"denied or failed" on the *first* attempt against a fresh or just-restarted
dev server, repeatedly, this entire session — but the page had usually
already loaded by the time a follow-up `screenshot` or `get_page_text` ran.
Screenshots taken in that window sometimes came back blank even once the
page was live; `read_page`'s accessibility-tree dump was reliable every
time it was tried instead. Once, the dev server actually had died between
attempts (`preview_list` returned empty) and needed a real restart. Lesson
for next time: don't trust a bare `navigate` failure or a blank screenshot
at face value — check `read_page` or re-navigate on a fresh tab before
concluding the server itself is broken.

## 16 August, one more — header CSS fixed, Tehran clock + rates ship (`256876c`, `ea375fb`)

Farjad flagged the header ("something's off, can't say why") alongside
three other asks. Investigated first rather than guessing: `globals.css`
had two full `.site-header` definitions, the pre-rebuild pill-header
rule's padding/margin/border-radius/box-shadow leaking through at every
width since the Aug 23 rebuild only redeclared position/background/
backdrop-filter, plus two leftover `@media` blocks piling more of the same
on top — one of which killed `position: sticky` entirely below 720px.
Deleted the dead rule and both media blocks; verified computed styles at
390px and desktop width directly, not just visually. Full writeup in
`06-gotchas.md`.

Then built the other three asks, footer-only per Farjad's "don't get in
the way": Tehran clock + Jalali + Shahanshahi date (own Gregorian<->Jalali
conversion in `@charana/core`, the standard non-table astronomical
algorithm — verified against known Nowruz dates with `tsx` before wiring
it in anywhere), and real free-market USD/EUR/CAD via Navasan (Farjad's
choice over other sources). No `NAVASAN_API_KEY` exists yet, so the rates
line is correctly absent — asked Farjad for the key rather than guessing
at Navasan's exact response field names with no way to verify them; the
fetcher logs the raw response's key names on its first real call so the
guessed `SYMBOL_CANDIDATES` can be corrected from that instead of the
widget just staying silently empty. Shipped to mobile too: a new public
`/api/mobile/exchange-rates` route (the key can't ship in the Expo
bundle), clock computed on-device since Hermes has full Intl/ICU on this
Expo SDK.

## 16 August — home page redesign (`484866f`)

Farjad: "redesign the home page, there's some repetition, make it
attractive and standards-based and user-need-driven." Read the whole page
before touching it, because "repetitive" turned out to name three real
defects rather than a style preference:

1. **جدیدترین and پربازدیدترین were the same list.** Two identical 6-card
   grids back to back, and with today's data the *same three* businesses
   (آشاوید، فرجاد پورمحمد، صرافی لومیر) filled both. Now popular is
   deduplicated against newest and gated on a real `view_count`, fed from
   an over-fetched pool of 18 so the row doesn't go short after the
   subtraction. Verified in the rendered DOM, not just in source: six and
   six, zero overlapping hrefs.
2. **The owner CTA appeared three times** — hero, sticky header, dedicated
   section. Dropped the hero's; the header carries it on every page.
3. **Trust was argued twice** — a four-card "چرا čārana؟" and a paragraph
   headed "اطلاعات قابل اعتماد" — and the second one repeated the three
   legal links that the footer renders immediately beneath it. Merged.

Two genuine bugs fell out of the reading:

- **"مشاهده همه" was a 404.** It pointed at `/categories/all`;
  `categories/[slug]` has no "all" case. Now `/businesses`, which is the
  real paginated listing.
- **The app mock hard-coded `+۶۷۷ کسب‌وکار`** while the hero counted 680
  live from the database on the same screen. Takes the live count now.
  Exactly the class the house honesty rule exists for, and it had been
  sitting in the most-designed section of the page.

Layout work: the hero was a 7/5 split that put a 2×2 block of large stat
cards level with the search box, so the page's primary action competed
with four numbers nobody arrives for. It's centred and single-column now,
search widest and highest-contrast, the four counts demoted to one thin
strip beneath it (same real numbers, still counting up). Categories moved
directly under the hero — it's the main path for a visitor with no search
term ready, and it had been sitting below two conditional sections that
are empty on most days. One shared `SectionHead` so ten sections read as
one page.

Checked at 375px and 1280px wide, `tsc` and production build clean.

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

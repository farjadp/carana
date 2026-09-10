# Changelog

All notable changes to this project are tracked here.

## 2.3.1 - 2026-09-10

### Fixed

- **«پرجستجو» was measuring its own suggestions.** `top_searches()` went live
  and returned «وکیل مهاجرت» (347), «املاک» (91), «رستوران ایرانی» (43),
  «حسابدار» (38), «دندانپزشک» (35), «مکانیک» (31) — the top seven all being
  terms that were already hard-coded chips on the home hero or in the `/search`
  empty state. A chip click navigates to `/search`, which logs every query it
  serves, so the chips had been seeding the log they now read from. Nothing was
  false and it was not informative: left alone, the chip row would have frozen
  on those six permanently, each impression buying the clicks that justified
  the next impression.
  - Chip links now carry `?from=chip`, the smart block's related terms
    `?from=smart`, and `/search` logs the source it was given. Only an absent
    `?from=` — a query someone typed — is recorded as `web`.
  - `supabase/migrations/20260910100000_top_searches_typed_only.sql` makes the
    function count `source = 'web'` alone. **Not applied yet.**
  - The ~10 days of rows written before this cannot be relabelled (a chip click
    and a typed «وکیل مهاجرت» are identical in the table), so they age out of
    the 90-day window rather than being guessed at.

## 2.3.0 - 2026-09-09

### Changed — home page v3

A UX pass over the *rendered* home page rather than its source. Six of the ten
findings were properties of the data on the day and were invisible in the code.

- **Honesty.** The hero's gold stat was «۱۷ مالکیت احرازشده» beside «۹۶۹۳
  کسب‌وکار» — every figure true, and the loudest fact on the first screen was
  that 0.17 % of the directory is proven. `verified` moves to the «فقط
  احرازشده» filter on `/search`, which already existed; the fourth stat is now
  `updatedThisWeek`. The «پرجستجو:» chips were a hard-coded array and now come
  from the search log, with the label derived from whether the data arrived
  («مثلاً:» when it did not). «دسته‌بندی‌های پرجستجوی پلازا» was captioning
  rows ordered by `display_order`.
- **Fixed a shipped label bug.** The categories query carried `.limit(10)` and
  its rows were also the slug → name map for every card, so the two categories
  past the limit had no label and six live cards printed «digital-it».
  `BusinessCard` additionally stops falling back to the raw slug, which covers
  a row whose `category` has no entry in `categories` at all.
- **Twelve sections to nine** (6,424px at 1440 wide). «ویژه» and
  «تازه‌ترین اعلان‌ها» — two cards and one card, each in a three-column grid —
  merged into one band that sizes its grids from their own length and captions
  itself with what is actually below. «جدیدترین» and «پربازدیدترین» merged into
  one tabbed rail; the view counts (46 down to 11) are no longer printed. Blog
  rail 10 → 6 posts, English titles off the cards. The home page's suggestion
  box was dropped — it is already on the zero-result search page.
- **Our own listings** (`lib/data/internal-businesses.ts`) no longer take the
  home page's promotional slots; they held both «ویژه» cards and three of the
  six «پربازدیدترین» ones. Unchanged in search, category, city and sitemap.
- **City affordances.** City cards now come from the geo index, so Richmond
  Hill (1,108), North York (467) and Thornhill (402) appear for the first time.
  New category × city links carrying the count of the page they lead to.

### Added

- `GET /api/suggest` — typeahead over the same `search_businesses` RPC the
  results page runs, returning businesses, categories and cities with counts.
  Nothing is logged: one row per keystroke would turn the query log into a
  keylogger and the demand signal into noise.
- `components/search/search-box.tsx` — one search control for the home hero and
  `/search`, with keyboard navigation and combobox semantics. City dropdowns
  are Persian labels with real counts instead of the raw English
  `businesses.city` values they had been showing on an RTL page.
- `lib/geo/visitor-city.ts` — the search box starts on the visitor's own city
  when the edge names one we have listings for, shown as a removable chip. A
  true «نزدیک من» is not possible: `businesses` has no lat/lng column.
- `supabase/migrations/20260909100000_top_searches.sql` — a SECURITY DEFINER
  aggregate over the admin-only `search_queries`, returning terms and counts
  only. **Not applied yet**; the hero fails soft until it is.

### Not shipped

- An «باز است الان» filter. Six of 9,693 published rows have any
  `working_hours`. Filed in `docs/05-open-tasks.md`.

## 2.2.0 - 2026-09-08

### Security

- Added a per-address scrape ceiling to the proxy (`lib/security/throttle.ts`,
  called from `apps/web/proxy.ts`). The directory's listings were servable in
  bulk at whatever rate the CDN would answer: `/businesses/[slug]` is ISR, so
  a scraper is served from the edge cache and the page component never runs,
  which is why no per-route limit could see the traffic. Middleware is the
  only code of ours on the path of a cached hit.
  - 600 requests/minute and 5000/hour per address+user-agent from CA/US;
    200/1500 from elsewhere, keyed on the platform's geo header.
  - Exempt: search engines, signed-in users, static files, and `/api`, which
    already has per-route limits.
  - Over the ceiling gets a plain 429 with `Retry-After` and `noindex`. No
    CAPTCHA and no challenge page, by instruction: nothing may make the site
    harder to use for a real visitor.
  - The ceiling is high because Next prefetches every `<Link>` entering the
    viewport and the listings grid renders 48 cards, so a visitor who only
    scrolls fires ~48 requests per page. Prefetches cannot be identified in
    the proxy (see below), so the limit absorbs them instead.
  - **This is an in-memory counter per edge isolate and does not pretend
    otherwise.** It stops the crude single-source scraper. It does not stop a
    distributed one, and it does not stop a forged Googlebot user agent —
    verifying that needs a reverse DNS lookup the edge runtime cannot do. A
    Vercel WAF rule is the other half and is configuration, not code.

### Documentation

- `06-gotchas.md`: Next strips `Next-Router-Prefetch` (and `RSC`) from the
  request before `proxy.ts` runs, so an exemption keyed on that header
  typechecked and was dead code — deleted rather than repaired. Second lesson
  in the same entry: a time-windowed limiter cannot be tested by a loop too
  slow to fill the window. 130 sequential requests against `next dev` (~4
  req/s) returned all-200 and looked like proof the limiter was broken; 150
  concurrent ones showed it firing at exactly the configured limit.

**Note on this file.** It was last touched at 2.1.0 on 20 Aug and does not
cover the blog, the channels directory, GPLZ Link, standing & loyalty or the
gooya import, all of which shipped in between. `docs/07-session-log.md` is the
continuous record; this file has gaps and they were not backfilled here
because doing so from memory would invent detail.

## 2.1.0 - 2026-08-20

### Security

- Moved authorization into RLS so it also applies to clients that talk to
  Supabase directly (`20260820_security_hardening.sql`):
  - `is_admin()` / `has_business_access()` are now `SECURITY DEFINER`. Without
    this they recursed against the `profiles` policies and silently returned
    false, disabling every admin policy in the schema.
  - `handle_new_user()` no longer reads `desired_role` from client-supplied
    metadata. Anyone could previously sign up as `admin`.
  - Users can no longer change their own `role`.
  - Owners can no longer set their listing to `APPROVED` / `PUBLISHED`.
  - Review authors can no longer publish their own reviews.
  - `verification_codes` is server-only; the owner could previously read
    their own OTP.
  - The `businesses` storage bucket is scoped to the uploader's folder.
- Added `requireAdmin()` and applied it to `/api/admin/businesses/bulk-insert`
  and `/api/admin/businesses/ai-categorize`, which had no role check at all,
  and to `moderateReview()`, which carried a `TODO` in place of one.
- Removed four repo-root debug scripts containing a hard-coded
  `SUPABASE_SECRET_KEY`.
- Business detail page no longer falls back to the service-role client, which
  exposed unpublished listings, and no longer selects verification columns.
- Replaced interpolated PostgREST `.or()` filters with parameterised `.eq()`.
- Business edit actions whitelist writable columns instead of spreading the
  client payload into `update()`.
- Verification codes are hashed at rest, never returned to the client, capped
  at 5 attempts, and rate-limited to one send per minute.
- Blocked SSRF in `scrapeWebsiteForBusiness()`: the action fetched any URL the
  user typed, including `localhost`, private ranges and cloud metadata
  endpoints. It now requires a public http(s) host, refuses redirects, times
  out after 10s, and requires a signed-in caller.
- Added per-user rate limits to the AI endpoints (20/hour for generation,
  10/hour for website scraping), which previously had none.

### Fixed

- Business detail page read from `user_interactions`, a table that does not
  exist, so the reviews tab was always empty and private notes never loaded.
  Interactions now read from `user_business_interactions` and reviews from
  published rows in `public_reviews`, honouring `display_identity` for the
  reviewer's shown name.

- Production build now succeeds. `verify-contact/page.tsx` was `"use client"`
  while importing `PageShell`, pulling `next/headers` into the browser bundle.
- `profile/actions.ts` used the read-only server client inside server actions,
  discarding refreshed auth cookies.
- `NEXT_PUBLIC_BASE_URL` is now required in production instead of silently
  falling back to `localhost:3000` in password-reset emails.
- Corrected invalid `Button variant="outline"` and `PageShell
  currentSection="profile"` props.
- Bulk import generates deterministic, de-duplicated slugs instead of random
  numeric suffixes.

### Changed

- `pnpm-lock.yaml` is committed again; `*.tsbuildinfo` is ignored.
- Added `.npmrc` with `node-linker=hoisted` (required for Metro/Expo later).
- Pinned `packageManager` to pnpm 9.
- Added `typecheck`, `gen:types`, and `db:push` scripts.
- `.env.example` documents every variable the app actually reads.

## 1.2.1 - 2026-08-11

- Changed the signup flow so successful registration redirects to a dedicated confirmation page instead of dropping the user directly into the profile.
- Added `/auth/signup-success` with a clear success message and a direct button to enter the profile.

## 1.2.0 - 2026-08-11

- Added top-of-file documentation headers to the main routes, components, CSS, and utility modules.
- Added `README.md`, `CHANGELOG.md`, and `ARCHITECTURE.md`.
- Added auth pages for login, signup, forgot password, and password update.
- Added in-app user-access architecture and dashboard scaffolds.
- Added Supabase public/server environment validation and helper clients.

## 1.1.0 - 2026-08-11

- Migrated the prototype to Next.js App Router with TypeScript and Tailwind CSS.
- Added shared layout, header, footer, legal pages, and reusable UI primitives.
- Added Supabase readiness state to the homepage.

## 1.0.0 - 2026-08-11

- Created the initial Persian landing experience for čārana.
- Reframed the concept as a directory of Iranian businesses in Canada.
- Split the one-page prototype into separate brand and product pages.

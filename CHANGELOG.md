# Changelog

All notable changes to this project are tracked here.

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

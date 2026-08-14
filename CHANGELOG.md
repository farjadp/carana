# Changelog

All notable changes to this project are tracked here.

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

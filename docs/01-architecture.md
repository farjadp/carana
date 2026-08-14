# Architecture

## Product

čārana is a Persian-first directory of Iranian businesses in Canada, operated by
**Ashavid Inc.** (Toronto, Ontario). Consumers search for Persian-speaking
lawyers, doctors, restaurants, realtors. Business owners pay for featured
placement and advertising — a B2B advertising service, which is why the App
Store's in-app-purchase rules do not apply (see `05-mobile.md`).

## Repository shape

```
charana/
├── apps/
│   ├── web/          Next.js 16, App Router — the whole website + admin
│   └── mobile/       Expo SDK 57, Expo Router — consumer app
├── packages/
│   └── core/         Everything genuinely shared by both platforms
├── supabase/
│   └── migrations/   16 SQL migrations, the schema's source of truth
└── scripts/          One-off operational scripts (import, logo re-hosting)
```

Turborepo + pnpm workspaces. `pnpm dev` runs both apps; `pnpm dev:web` and
`pnpm dev:mobile` run one.

## What lives in `packages/core`

Deliberately small. Only things that are true for both platforms:

| File | Contents |
|---|---|
| `database.types.ts` | Generated from the live schema — `pnpm gen:types` |
| `business-schema.ts` | Zod schemas for the 7-step onboarding form |
| `listing-status.ts` | The listing state machine and the private-column list |
| `provinces.ts` | Province taxonomy with Persian names |
| `import-normalize.ts` | Cleaning rules for scraped directory data |
| `slug.ts` | Persian-aware slugify |

A `packages/api` layer was **not** extracted. With no second consumer for it
yet, that would have been speculation. Pull pieces out as mobile screens
actually need them.

## Data flow

```
Browser ──► Next.js server component ──► Supabase (RLS as the caller)
                    │
                    └─► server action ──► Supabase (RLS, or service role
                                           after an explicit role check)

Mobile  ──────────────────────────────► Supabase (anon key, RLS only)
```

The mobile app talks to Supabase **directly**. It never passes through Next.js.
That single fact drives the whole security model — see `02-security.md`.

## Web routes

**Public:** `/`, `/categories`, `/categories/[slug]`, `/provinces`,
`/provinces/[slug]`, `/cities`, `/cities/[slug]`, `/businesses`,
`/businesses/[slug]`, plus the marketing and legal pages.

**Auth:** `/auth/login`, `/auth/signup`, `/auth/forgot-password`,
`/auth/update-password`, `/auth/callback`, `/auth/logout`.

**Owner:** `/dashboard`, `/dashboard/business`, `/dashboard/business/new`,
`/dashboard/business/[id]/edit`, `/dashboard/verify-contact`, `/profile`.

**Admin:** `/admin/login`, `/admin` and the sections under it — listings, users,
categories, reviews, logs, and the CSV importer.

**Machine:** `/robots.txt`, `/sitemap.xml`,
`/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`.

## Mobile screens

Tabs: home, categories, location (province → city), search.
Stack: `/categories/[slug]`, `/cities/[city]`, `/provinces/[slug]`,
`/business/[slug]`.

Auth, saving, private notes and reviews are **not built on mobile yet**. Owner
dashboard and admin are deliberately web-only and should stay that way — the
7-step onboarding form is laptop work.

## Deliberate decisions worth knowing

**RLS is the authorization layer, not the server actions.** Anything enforced
only in a server action does not exist for the mobile client.

**Public queries list their columns explicitly.** Postgres does not apply RLS
per column, so `select("*")` on `businesses` returns the verification fields.
There is a `PRIVATE_BUSINESS_COLUMNS` constant in `packages/core` naming them.

**The owner dashboard and admin stay on web.** Mobile is consumer-only, which
also keeps every payment surface out of the app and away from App Store
in-app-purchase rules.

# Architecture

## Product Direction

`čārana` is a Persian-first directory for Iranian businesses in Canada, not a
general classifieds marketplace.

## Platforms

- **Web (this repo)** — Next.js 16 App Router. Public directory, business
  owner dashboard, admin panel.
- **Mobile (planned)** — Expo / React Native, consumer-facing only. Business
  onboarding and admin stay on web.

## User Roles

`public.app_role`: `user`, `business_owner`, `moderator`, `admin`.

New accounts are always created as `user`. Roles are only ever changed by an
admin — `handle_new_user()` deliberately ignores client-supplied metadata.

## Core Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user. Role, contact, verification timestamps. |
| `businesses` | Listings. Status state machine, contact, media, hours, services, branches. |
| `business_memberships` | Which users may manage which listing. |
| `business_claims` | Requests to claim an existing listing. |
| `categories` | Admin-managed category taxonomy. |
| `user_business_interactions` | Private per-user notes, ratings, saved state. |
| `public_reviews` | Public reviews, moderated before publication. |
| `user_activity_logs` | Login / role change / moderation audit trail. |
| `verification_codes` | Hashed contact-verification OTPs. Server-only. |

## Listing State Machine

```
DRAFT ──▶ SUBMITTED ──▶ APPROVED / PUBLISHED
             ▲   │
             │   ├──▶ NEEDS_CHANGES ──┐
             └───┤                     │
                 └──▶ REJECTED ────────┘
```

Owners may only leave a row in `DRAFT` or `SUBMITTED`. Moving to
`APPROVED` / `PUBLISHED` is admin-only and enforced in RLS, not just in
application code.

## Access Model

**RLS is the source of truth.** Every rule that matters is enforced in the
database, not in server actions. This is deliberate: a mobile client talks to
Supabase directly and never passes through Next.js, so any check that lives
only in a server action does not exist for that client.

- Public read is limited to `PUBLISHED` / `APPROVED` listings.
- Owners read and write their own listings, minus `status`.
- Admin/moderator access goes through `public.is_admin()`, which is
  `SECURITY DEFINER` so it can read `profiles` from inside a `profiles` policy.
- Storage buckets are scoped by `auth.uid()` folder prefix.

Server-side code additionally whitelists writable columns (see
`OWNER_EDITABLE_COLUMNS`) so a rejected write produces a useful error rather
than a bare RLS failure.

## Auth Flows

Signup, login, forgot password, password reset, email confirmation callback,
contact verification (phone/email OTP).

## Next Steps

- Generate and commit `lib/supabase/database.types.ts` (`pnpm gen:types`)
- Extract a transport-agnostic data-access layer for web/mobile sharing
- Convert the repo to a Turborepo monorepo (`apps/web`, `apps/mobile`)
- Wire a real SMS/email provider for verification codes
- Add rate limiting to the AI routes

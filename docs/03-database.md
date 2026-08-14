# Database

Supabase Postgres. Project ref `flrpuzmqsqgrfutzoyop`.
Schema source of truth is `supabase/migrations/` — 16 files, all applied,
history in sync (`npx supabase db push --dry-run` reports `upToDate: true`).

## Live data, 2026-08-24

| | |
|---|---|
| businesses | 677, all `PUBLISHED` |
| — with a real city | 268 |
| — with `city = 'نامشخص'` | 409 (see `06-data-import.md`) |
| categories | 12, all active |
| profiles | 2 |
| public_reviews | 0 |
| logos on our storage | 618 |
| logos using the placeholder | 59 |
| logos hotlinked elsewhere | **0** |

## Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user. Role, contact, verification timestamps. Created by trigger on `auth.users` insert. |
| `businesses` | Listings. Status machine, contact, media, hours, services, branches. |
| `business_memberships` | Who may manage which listing. Built, unused. |
| `business_claims` | Claim requests. Built, unused. |
| `categories` | Admin-managed taxonomy. 12 rows. |
| `user_business_interactions` | Private per-user notes, ratings, saved state, media. |
| `public_reviews` | Public reviews, moderated before publication. |
| `business_change_reviews` | Audit trail of every edit-classification decision. |
| `user_activity_logs` | Login, logout, role change, moderation. Includes IP. |
| `verification_codes` | Hashed contact OTPs. Server-only, no client policy. |

## Listing state machine

```
DRAFT ──▶ SUBMITTED ──▶ APPROVED / PUBLISHED
            ▲  │
            │  ├──▶ NEEDS_CHANGES ──┐
            └──┤                     │
               └──▶ REJECTED ────────┘
```

An owner may only ever leave a row in `DRAFT` or `SUBMITTED`. Moving to
`APPROVED` or `PUBLISHED` is admin-only, enforced in RLS.

Editing a row that is already live is blocked at the RLS level entirely; it
goes through the server action and the change classifier.

## Helper functions

All are `SECURITY DEFINER` with `search_path = public`. This matters: without
it, `is_admin()` reads `public.profiles`, whose own policies call `is_admin()`,
and the recursion made it return false — silently disabling every admin policy
in the schema.

| Function | Returns |
|---|---|
| `is_admin(uuid)` | true for `admin` or `moderator` |
| `has_business_access(business, user)` | membership check |
| `current_user_role()` | the caller's role, for the "role must not change" check |
| `business_current_status(uuid)` | pre-update status, used inside `WITH CHECK` |
| `review_current_status(uuid)` | same, for reviews |

The `*_current_status` helpers are `STABLE`, so inside an `UPDATE` they see the
snapshot from statement start and return the **old** value. That is what lets a
policy say "the status may stay as it is, or move to one of these".

## Migrations

| File | What it did |
|---|---|
| `20260811_auth_roles` | First schema: profiles, businesses, memberships, claims, RLS |
| `20260812_activity_logs` | Audit log |
| `20260813_businesses_expansion` | Status enum, ~30 listing columns |
| `20260813010000_services_branches` | JSONB services and branches |
| `20260813020000_storage_buckets` | `businesses` bucket |
| `20260814_user_interactions` | Interactions and public reviews |
| `20260815_user_profiles_expansion` | Mobile, birth date, avatar |
| `20260816_categories` | Categories table + 10 seed rows |
| `20260817_fix_approved_status` | Data fix, APPROVED → PUBLISHED |
| `20260818_interaction_media` | Private media + `user-media` bucket |
| `20260818010000_add_business_media` | `social_media` column |
| `20260819_contact_verification` | OTP table |
| `20260820_security_hardening` | **The big one** — see `02-security.md` |
| `20260821_change_review` | Change-review table, closed the edit bypass |
| `20260822_categories_v2` | Added `automotive` and `digital-it`, new artwork paths |
| `20260823_province_backfill` | Province normalisation, published the backlog, indexes |

## Two rules learned the hard way

**Never apply SQL by hand in the dashboard.** The migration history table drifts
from the real schema, and the next `db:push` tries to replay everything from the
beginning. That is what had happened here: 13 migrations were applied by hand
and the history table was empty. Repairing it took `supabase migration repair`
plus a column-by-column comparison against the live database, which turned up
**two migrations that had never actually run** — contact verification and
`businesses.social_media`.

**Migration versions must be unique.** Three files shared the prefix `20260813`
and two shared `20260818`. `db:push` failed on a duplicate primary key in
`schema_migrations`. Use a full `YYYYMMDDHHMMSS_name.sql` prefix.

## Commands

```bash
pnpm db:push          # apply pending migrations
pnpm db:diff          # see drift
pnpm gen:types        # regenerate packages/core/src/database.types.ts
```

Regenerate and commit the types after any schema change — both apps import them.

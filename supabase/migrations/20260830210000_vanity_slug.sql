-- ============================================================================
-- Migration: vanity English URL (Premium feature)
-- Date: 2026-08-16
--
-- charana.ca/b/dr-ahmadi instead of the Persian slug every business gets by
-- default (see the standing "all URLs must be English" note and the
-- open-tasks item on packages/core/src/slug.ts — this is deliberately
-- English-slugged from day one rather than inheriting that gap).
--
-- Uniqueness is case-insensitive on purpose (Postgres text equality is
-- case-sensitive by default, which would let "Dr-Ahmadi" and "dr-ahmadi"
-- collide invisibly at read time while passing a naive unique constraint).
-- Format (lowercase letters, digits, hyphens) is enforced in the server
-- action, not here — same reason as every other plan-gated field: the
-- action already has to check the plan, so the format check lives next to
-- it rather than half in SQL and half in application code.
-- ============================================================================

alter table public.businesses
  add column if not exists vanity_slug text;

create unique index if not exists businesses_vanity_slug_idx
  on public.businesses (lower(vanity_slug))
  where vanity_slug is not null;

comment on column public.businesses.vanity_slug is
  'Premium-only custom English URL segment, resolved at /b/[slug]
   (app/b/[slug]/route.ts) with a 301 to the real profile — an alias, not a
   second rendered page, so there is only ever one indexable URL per
   business. Gated on the vanity_url plan feature; see
   lib/actions/vanity-url.ts::setVanitySlug.';

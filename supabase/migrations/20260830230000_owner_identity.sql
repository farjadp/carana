-- ============================================================================
-- Migration: show who is behind a verified listing, and let Premium hide it
-- Date: 2026-08-17
--
-- The public profile gains an "owner" section, but only where the claim is
-- actually backed:
--   * the listing is verified (verified_at/verified_until inside the window —
--     computed by @charana/core verification-status, not stored), and
--   * a real person is attached: owner_user_id for a claimed listing, or
--     created_by for one the owner registered themselves. Imported rows are
--     created_by imports@charana.ca and have no owner_user_id, so they show
--     nothing — which is correct, nobody has proved anything about them.
--
-- hide_owner is the Premium control. Two deliberate choices:
--
--   1. Default false (visible). Free and Starter are always visible; that is
--      the product decision. A default of true would make the paid feature
--      "turn it back on", which is the opposite of what was asked.
--
--   2. It is honoured at read time regardless of the *current* plan. Only a
--      Premium owner can set it (lib/actions/owner-visibility.ts checks the
--      entitlement on write), but a lapsed subscription must not republish a
--      person's name. Every other plan-gated field recomputes from
--      plan_until and reverts on expiry; this one does not, because the thing
--      that would revert is somebody's identity, not a placement or a quota.
-- ============================================================================

alter table public.businesses
  add column if not exists hide_owner boolean not null default false;

comment on column public.businesses.hide_owner is
  'Premium-only owner control: hide the "owner" section on the public
   profile. Written only by lib/actions/owner-visibility.ts after an
   entitlementsFor(...).has(''owner_privacy'') check. Read unconditionally —
   a lapsed plan never re-exposes a name that was deliberately hidden.';

-- No RLS policy is added on purpose. Owners have no UPDATE grant on a
-- PUBLISHED businesses row (same as gallery, busy_status, review replies,
-- vanity_slug); the server action is the only writer, via the service role.

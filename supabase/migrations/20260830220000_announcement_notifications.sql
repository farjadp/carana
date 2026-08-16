-- ============================================================================
-- Migration: opt-in email notification when a followed business posts
-- Date: 2026-08-16
--
-- Reuses user_business_interactions rather than a new "follows" table — a
-- user already marks a business "saved" there, and the RLS on that table
-- already lets a user read/write only their own rows (no service-role gate
-- needed for the toggle itself, unlike the plan-gated fields).
--
-- Defaults to false on purpose: "saved" already means "I bookmarked this",
-- it does not mean "email me". Opt-in, not opt-out — an unannounced email
-- to everyone who ever saved a business would be the same kind of
-- unbacked promise this project keeps refusing to ship.
-- ============================================================================

alter table public.user_business_interactions
  add column if not exists notify_announcements boolean not null default false;

comment on column public.user_business_interactions.notify_announcements is
  'Explicit opt-in: email this user when the business posts a new
   announcement (lib/actions/announcements.ts::createAnnouncement). Not
   implied by personal_status = saved.';

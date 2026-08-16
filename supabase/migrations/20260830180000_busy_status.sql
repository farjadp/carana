-- ============================================================================
-- Migration: live "busy now / quiet now" status (Starter+ feature)
-- Date: 2026-08-16
--
-- A manual toggle, not a computed one — the owner says the floor is busy,
-- we don't infer it. Self-expiring on purpose: busy_status_until is set a
-- few hours out whenever the owner sets it (see BUSY_STATUS_HOURS in
-- lib/business/live-status.ts), so a status set once during a Friday rush
-- can't silently keep showing "busy" a week later because nobody remembered
-- to clear it. Expiry is checked in application code the same way
-- verified_until and plan_until are — no cron needed.
-- ============================================================================

alter table public.businesses
  add column if not exists busy_status text check (busy_status in ('busy', 'quiet')),
  add column if not exists busy_status_until timestamptz;

comment on column public.businesses.busy_status is
  'Owner-set, self-expiring (busy_status_until). null once expired or
   cleared — treat busy_status_until < now() as "no status", same pattern
   as verified_until. Gated on the busy_status plan feature; see
   lib/business/live-status.ts::setBusyStatus.';

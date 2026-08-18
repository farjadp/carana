-- ============================================================================
-- Migration: job_posts expiry reminder bookkeeping
-- Date: 2026-08-18
--
-- Expiry stays a comparison against now() — nothing here turns it into a
-- status. This column only records that we told the owner, so a daily cron can
-- ask "have we said this already?" without sending the same nudge every
-- morning for three days running.
--
-- Deliberately a timestamp and not a boolean: a post that is extended and then
-- approaches expiry again has to be nudged again, and the reminder is reset by
-- the extend action rather than by anyone remembering to clear a flag.
-- ============================================================================

alter table public.job_posts
  add column if not exists expiry_reminder_sent_at timestamptz;

-- The cron scans by expiry inside a narrow window; this keeps that scan from
-- reading the whole table once the board has real volume.
create index if not exists job_posts_expiry_reminder_idx
  on public.job_posts (expires_at)
  where status = 'published' and closed_at is null;

-- ============================================================================
-- Migration: Track which renewal reminder was last sent
-- Date: 2026-08-25
--
-- verification_reminder_sent_at alone cannot answer "have we already sent the
-- 7-day warning?". Without the stage, a daily job either sends one reminder
-- ever, or sends the same one every day until the owner acts. Neither is a
-- reminder; the first is a whisper and the second is harassment.
-- ============================================================================

alter table public.businesses
  add column if not exists verification_reminder_stage smallint
    check (verification_reminder_stage in (30, 7, 0));

comment on column public.businesses.verification_reminder_stage is
  'Days-remaining bucket of the last reminder sent: 30, 7, or 0 (lapsed).
   Stages descend, so a reminder goes out only when the current bucket is
   lower than this. Reset to null on renewal.';

-- The reminder job scans for listings inside the window on every run.
create index if not exists idx_businesses_reminder_scan
  on public.businesses (verified_until, verification_reminder_stage)
  where verified_until is not null;

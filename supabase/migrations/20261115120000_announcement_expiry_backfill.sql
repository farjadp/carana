-- ============================================================================
-- Migration: announcements always end
-- Why: expires_at = null meant "never expires" to every reader, including
--      search_announcements(). The dashboard no longer offers that option
--      (packages/core/src/announcements.ts); this gives the rows written
--      before the change the same 30-day ceiling, counted from when they were
--      posted. Idempotent: only touches rows that are still null.
-- ============================================================================
update public.business_announcements
   set expires_at = created_at + interval '30 days'
 where expires_at is null;

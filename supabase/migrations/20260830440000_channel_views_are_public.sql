-- ============================================================================
-- Migration: a channel's view count is public, and until now nobody could read it
-- Date: 2026-08-26
--
-- `analytics_daily` has no policy granting anon a SELECT, which is right for
-- the rows it was built for: a bio page's traffic belongs to whoever owns the
-- page and is part of what the $13 tier sells.
--
-- Channel view counts are the opposite. They are published ON the public page
-- — «بازدید در گوپلازا» on the channel itself, and a figure beside each entry
-- in the "چند کانال دیگر" strip — and they describe a public listing, not a
-- customer's private traffic.
--
-- So the read was silently returning nothing. Not an error, not a log: an
-- empty result, which renders as zero, which is indistinguishable from a
-- channel nobody opened. `channel_view_count()` was affected the same way —
-- it is a plain SQL function and runs with the caller's privileges, so it
-- returned 0 to every anonymous visitor. That the tile never appeared anyway
-- (the view floor hid it) is luck, not design.
--
-- The policy is scoped twice: to channel rows only, and to channels the public
-- can actually open. It must not become a door onto link_page rows.
--
-- Env / Identity: read-only grant to anon and authenticated. Writes are
--      unaffected — the rollup runs with the service role.
-- ============================================================================

drop policy if exists "Channel view counts are public" on public.analytics_daily;

create policy "Channel view counts are public"
on public.analytics_daily for select
to anon, authenticated
using (
  subject_kind = 'channel'
  and exists (
    select 1 from public.channels c
    where c.id = subject_id
      and c.status = 'published'
      and (c.confirm_by is null or c.confirm_by > now())
  )
);

comment on policy "Channel view counts are public" on public.analytics_daily is
  'Channel traffic is published on the channel''s own public page, so it is
   readable by anyone. Scoped to subject_kind = ''channel'' and to channels the
   public can open — a bio page''s numbers stay private, which is what the rest
   of this table exists for.';

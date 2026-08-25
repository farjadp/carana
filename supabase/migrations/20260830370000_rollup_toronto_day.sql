-- ============================================================================
-- Migration: a "day" in the analytics rollup is a Toronto day, not a UTC one
-- Date: 2026-08-25
--
-- 20260830340000 bucketed `analytics_daily` by the UTC day and left the choice
-- flagged as open. Farjad decided on 25 Aug: America/Toronto.
--
-- Why it mattered enough to ask. A UTC boundary falls at 8pm the previous
-- evening in Toronto, so a restaurant's dinner service lands in tomorrow's
-- bucket. "Yesterday" in the owner's dashboard would not have been the owner's
-- yesterday — and the error is worst exactly where the traffic is, in the
-- evening.
--
-- Why now and not later. Stored rollups computed under one rule cannot be
-- reinterpreted under another; the raw events they came from expire at 90
-- days, so past a certain point the old buckets could not even be rebuilt.
-- `analytics_daily` has 0 rows today, so this costs nothing. In three months
-- it would have cost the history.
--
-- The known cost of this choice. British Columbia is three hours behind
-- Toronto, so a BC listing's daily chart is shifted by three hours. That is
-- visible but not misleading, and it is the honest trade against the
-- alternative: a per-business timezone would mean every rollup row carrying
-- the zone it was computed in, and a recompute whenever a listing's province
-- changed. The directory is Canadian and overwhelmingly Ontario.
--
-- `at time zone 'America/Toronto'` reads a wall-clock date as Toronto local
-- time and yields the timestamptz instant — so it follows DST on its own. The
-- two days a year that are 23 or 25 hours long are handled by Postgres, not by
-- us.
-- ============================================================================

create or replace function public.roll_up_link_day(p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer := 0;
begin
  delete from public.analytics_daily
   where subject_kind = 'link_page' and day = p_day;

  insert into public.analytics_daily (subject_kind, subject_id, day, event_type, dimension, value, n, uniques)
  select 'link_page', page_id, p_day, event_type, d.dimension, d.value,
         count(*), count(distinct visitor_hash)
    from public.link_events e
    cross join lateral (values
      ('',         ''),
      ('item',     coalesce(e.item_id::text, '')),
      ('referrer', coalesce(e.referrer_host, '')),
      ('device',   coalesce(e.device, '')),
      ('city',     coalesce(e.city, ''))
    ) as d(dimension, value)
   where not e.bot
     and e.created_at >= (p_day::timestamp     at time zone 'America/Toronto')
     and e.created_at <  ((p_day + 1)::timestamp at time zone 'America/Toronto')
     and (d.dimension = '' or d.value <> '')
   group by page_id, event_type, d.dimension, d.value;

  get diagnostics written = row_count;
  return written;
end $$;

comment on function public.roll_up_link_day(date) is
  'Idempotent by construction: it deletes the day before rewriting it, so a
   retried cron run cannot double count. A "day" here is a Toronto day
   (decision, 25 Aug 2026) — the owners are Canadian and a UTC boundary cut
   their evening in half. Changing this again after rollups exist invalidates
   every stored row, because the raw events behind them expire at 90 days.';

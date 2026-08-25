-- ============================================================================
-- Migration: which days still need rolling up
-- Date: 2026-08-25
--
-- `roll_up_link_day` computes one day. Something has to decide WHICH days, and
-- the naive answer — "yesterday, every night" — is wrong in two ways that only
-- show up later:
--
--   1. A missed run loses a day permanently. Raw events expire at 90 days
--      (prune_link_events), so a cron that was down for a week silently drops
--      a week of history that cannot be rebuilt once the raw rows are gone.
--      The gap would appear in a customer's paid analytics months later, with
--      nothing to explain it.
--   2. Yesterday is not finished when the run starts. An event written a
--      second before the boundary can land after the rollup reads. Rolling a
--      day exactly once assumes a quiet moment that does not exist.
--
-- So this asks the data instead of a calendar: every Toronto day that has raw
-- events but no rollup rows, plus today and yesterday unconditionally. Both
-- are cheap because `roll_up_link_day` is idempotent — it deletes the day
-- before rewriting it, so re-rolling a settled day produces the same rows.
--
-- The effect is a cron that heals itself. Miss a night and the next run fills
-- it in; miss a week and the next run fills the week, as long as it happens
-- inside the retention window.
--
-- The `at time zone` cast is what makes "day" mean a Toronto day here too,
-- matching 20260830370000. If those two ever disagree, this function will
-- report days as missing forever and the cron will rewrite them every night
-- without ever satisfying the condition.
-- ============================================================================

create or replace function public.link_days_needing_rollup(p_lookback integer default 95)
returns setof date
language sql
stable
security definer
set search_path = public
as $$
  with observed as (
    select distinct ((e.created_at at time zone 'America/Toronto')::date) as day
      from public.link_events e
     where e.created_at >= now() - (greatest(2, least(p_lookback, 400)) || ' days')::interval
       and not e.bot
  ),
  rolled as (
    select distinct a.day
      from public.analytics_daily a
     where a.subject_kind = 'link_page'
  ),
  today as (
    select ((now() at time zone 'America/Toronto')::date) as day
  )
  select day from (
    -- days with events but nothing computed
    select o.day from observed o where o.day not in (select day from rolled)
    union
    -- today and yesterday, always: a settled day is only settled in hindsight
    select day from today
    union
    select day - 1 from today
  ) d
  order by day;
$$;

comment on function public.link_days_needing_rollup(integer) is
  'The work list for the analytics cron. Returns every Toronto day holding raw
   events with no rollup, plus today and yesterday unconditionally. Safe to
   act on in any order — roll_up_link_day is idempotent. This is what makes a
   missed cron run recoverable instead of a permanent hole in someone''s paid
   history.';

grant execute on function public.link_days_needing_rollup(integer) to service_role;

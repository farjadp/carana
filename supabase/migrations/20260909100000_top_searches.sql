-- ============================================================================
-- Source: supabase/migrations/20260909100000_top_searches.sql
-- Version: 1.0.0 — 2026-09-09
-- Why: The home hero showed six chips under the label «پرجستجو:» that were a
--      hard-coded array in components/home-hero.tsx. Every search has been
--      logged into public.search_queries since 30 Aug, so the claim was
--      answerable — it just was not being asked. A label that asserts what
--      people search for, over a list nobody searched for, is the exact class
--      of violation CLAUDE.md's honesty rule names.
--
--      search_queries is admin-read only (and must stay that way: raw queries
--      are visitor data). So the aggregate is exposed through a SECURITY
--      DEFINER function that returns terms and counts only — never a row, an
--      IP, a user id or a timestamp.
--
--      Guards, so this can never leak a single person's search:
--        · only queries that RETURNED something (result_count > 0) — a
--          zero-result query is often a typo or a person's own name;
--        · a term must have been searched by at least `p_min_hits` distinct
--          sessions-worth of rows (default 3) before it can appear;
--        · terms of one character, or longer than 40, are dropped;
--        · a 90-day window, so the row stays current.
--
--      Until this is applied the site degrades honestly: lib/search.ts
--      topSearches() fails soft to null and the hero relabels its chips
--      «مثلاً:» instead of «پرجستجو:».
-- ============================================================================

create or replace function public.top_searches(
  p_limit integer default 6,
  p_days integer default 90,
  p_min_hits integer default 3
)
returns table (term text, hits bigint)
language sql
security definer
set search_path = public
stable
as $$
  select q_norm as term, count(*) as hits
  from public.search_queries
  where created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
    and result_count > 0
    and char_length(btrim(q_norm)) between 2 and 40
  group by q_norm
  having count(*) >= greatest(1, p_min_hits)
  order by count(*) desc, q_norm asc
  limit greatest(1, least(p_limit, 24));
$$;

revoke all on function public.top_searches(integer, integer, integer) from public;
grant execute on function public.top_searches(integer, integer, integer) to anon, authenticated;

comment on function public.top_searches is
  'Aggregated search terms for the home page chips. SECURITY DEFINER over the admin-only search_queries table; returns terms and counts only, never rows.';

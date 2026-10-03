-- search_businesses never used its trigram indexes for real visitors.
--
-- The function was SECURITY INVOKER, so it ran as `anon` under the
-- businesses_public_read RLS policy. pg_trgm's operators (LIKE through a trgm
-- index, %) are not LEAKPROOF, and Postgres will not evaluate a
-- non-leakproof predicate ahead of an RLS qual — so it cannot use them as
-- index conditions and falls back to a sequential scan of every listing,
-- running regexp_replace + similarity() on each one. Measured 2 Oct 2026:
-- «وکیل» took 1,131 ms as anon and 261 ms with the same body bypassing RLS.
-- Under load the anon statement_timeout (3 s) cut it off: 6,261 timeouts
-- since 25 Aug, ~7% of /search requests in the week before.
--
-- What changes (ranking formula untouched):
--   1. SECURITY DEFINER with a pinned search_path. The body already filters
--      to status IN ('APPROVED','PUBLISHED') — the rows the public read
--      policy shows anon — and returns only card columns the public listing
--      page shows anyway. The only thing RLS added (owners seeing their own
--      drafts) was already excluded by that status filter.
--   2. plpgsql + plan_cache_mode = force_custom_plan. A SECURITY DEFINER SQL
--      function is never inlined, so it is planned with q as an opaque
--      parameter and still chose the scan (1,002 ms). plpgsql with forced
--      custom plans plans every call with the real values, so arms that
--      cannot match are folded away and the BitmapOr over both trigram
--      indexes is used.
--   3. The keyboard-swap candidate is used only when it is letters, digits
--      and spaces. «وکیل» swaps to ",;dg": punctuation, two usable trigrams,
--      1,226 false candidates from the name index on every Persian search,
--      and English names ranked by their similarity to that junk. A real
--      wrong-layout word (یثدفشم → dental) is all letters and still matches.
--   4. The multi-word arms also require the first word as a plain LIKE, so
--      each has an indexable condition. Logically redundant — bool_and
--      already demands every word.
--
-- Checked before applying, against the 12 most-searched terms: 10 identical
-- top-24 lists and totals; «خرید و فروش» lost one row that matched only the
-- junk swap; «سوپرمارکت ایرانی» kept its total and its top 18, and the
-- bottom of the page no longer holds English names scored against
-- "s,mvlhv;j hdvhkd". Rollback: supabase/rollbacks/20261002100000_search_uses_its_indexes.sql

create or replace function public.search_businesses(
  q text,
  p_city text default null,
  p_category text default null,
  p_verified_only boolean default false,
  p_limit integer default 40,
  p_offset integer default 0
)
returns table(
  id uuid, ref_no integer, slug text, name text, name_en text, category text, sub_category text,
  tagline text, short_description text, city text, province text, phone text, website text,
  logo_url text, cover_url text, verified_until timestamptz, view_count integer, plan text,
  plan_until timestamptz, busy_status text, busy_status_until timestamptz, rank real, total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
set plan_cache_mode = force_custom_plan
as $function$
#variable_conflict use_column
declare
  v_qn text := public.fa_normalize(q);
  v_raw text := public.fa_normalize(public.keyboard_swap(q));
  v_qs text;                         -- NULL disables every swapped arm
  v_words text[];
  v_swords text[] := '{}';
begin
  if v_raw <> v_qn and v_raw ~ '^[[:alnum:][:space:]]+$' then
    v_qs := v_raw;
    v_swords := array_remove(regexp_split_to_array(v_raw, '\s+'), '');
  end if;
  v_words := array_remove(regexp_split_to_array(v_qn, '\s+'), '');

  return query
  with scored as (
    select b.*,
      (b.plan = 'featured' and (b.plan_until is null or b.plan_until >= now())) as is_featured,
      greatest(
        -- literal
        (case when n.nn = v_qn then 10 else 0 end)
      + (case when n.nn like v_qn || '%' then 4 else 0 end)
      + (case when n.nn like '%' || v_qn || '%' then 2 else 0 end)
      + (case when n.ne like '%' || v_qn || '%' then 2 else 0 end)
      + similarity(n.nn, v_qn) * 3
      + similarity(b.search_text, v_qn),
        -- keyboard-swapped, slightly discounted so a literal hit wins ties
        coalesce(0.9 * (
        (case when n.nn = v_qs then 10 else 0 end)
      + (case when n.nn like v_qs || '%' then 4 else 0 end)
      + (case when n.nn like '%' || v_qs || '%' then 2 else 0 end)
      + (case when n.ne like '%' || v_qs || '%' then 2 else 0 end)
      + similarity(n.nn, v_qs) * 3
      + similarity(b.search_text, v_qs)), 0)
      )
      + (case when b.verified_until is not null and b.verified_until > now() then 0.5 else 0 end)
      + least(coalesce(b.view_count, 0), 500) / 5000.0
      as rank_score
    from public.businesses b
    cross join lateral (
      select public.fa_normalize(b.name) as nn, public.fa_normalize(coalesce(b.name_en, '')) as ne
    ) n
    where b.status in ('APPROVED', 'PUBLISHED')
      and (
        v_qn = ''
        or b.search_text like '%' || v_qn || '%'
        or (cardinality(v_words) > 1
            and b.search_text like '%' || v_words[1] || '%'
            and (select bool_and(b.search_text like '%' || w || '%') from unnest(v_words) w))
        -- written against b.name, not n.nn, so it matches the expression index
        or public.fa_normalize(b.name) % v_qn
        or (cardinality(v_words) = 1 and b.search_text % v_qn)
        -- swapped layout
        or b.search_text like '%' || v_qs || '%'
        or (cardinality(v_swords) > 1
            and b.search_text like '%' || v_swords[1] || '%'
            and (select bool_and(b.search_text like '%' || w || '%') from unnest(v_swords) w))
        or public.fa_normalize(b.name) % v_qs
      )
      -- City: exact, or any city whose metro is p_city (North York → Toronto),
      -- or p_city itself being a member of the same metro.
      and (
        p_city is null or p_city = ''
        or lower(b.city) = lower(p_city)
        or exists (
          select 1 from public.city_metro m
          where lower(m.city_en) = lower(b.city)
            and lower(m.metro_en) = lower(p_city)
        )
        or exists (
          select 1 from public.city_metro m1
          join public.city_metro m2 on lower(m1.metro_en) = lower(m2.metro_en)
          where lower(m1.city_en) = lower(p_city) and lower(m2.city_en) = lower(b.city)
        )
      )
      -- Category: the slug, or any legacy spelling recorded as an alias.
      and (
        p_category is null or p_category = ''
        or b.category = p_category
        or exists (select 1 from public.category_aliases a where a.category_slug = p_category and a.alias = b.category)
      )
      and (not p_verified_only or (b.verified_until is not null and b.verified_until > now()))
  )
  select s.id, s.ref_no, s.slug, s.name, s.name_en, s.category, s.sub_category, s.tagline, s.short_description,
         s.city, s.province, s.phone, s.website, s.logo_url, s.cover_url, s.verified_until, s.view_count,
         s.plan, s.plan_until, s.busy_status, s.busy_status_until,
         s.rank_score::real, count(*) over ()
  from scored s
  order by s.is_featured desc, s.rank_score desc, s.name
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
end;
$function$;

grant execute on function public.search_businesses(text, text, text, boolean, integer, integer) to anon, authenticated;

-- The home page's «پرجستجو» chips run top_searches() on every uncached
-- render; it averaged 935 ms over a 138k-row log and timed out 60 times. A
-- partial index covering exactly its filter lets it read only typed,
-- non-empty rows in the window.
create index if not exists search_queries_top_terms
  on public.search_queries (created_at desc, q_norm)
  where result_count > 0 and source = 'web';

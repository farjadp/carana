-- ============================================================================
-- Migration: featured placement in search results
-- Date: 2026-08-16
--
-- lib/billing/entitlements.ts sortFeaturedFirst() sorts an in-memory array,
-- which only works within a single fetched page. search_businesses() paginates
-- in SQL (limit/offset), so featured-first has to be decided before the
-- limit/offset is applied or a featured row on page 2 would never out-rank a
-- free row on page 1. Same expiry rule as entitlementsFor(): a plan other
-- than 'free' with a past plan_until is treated as free, not featured —
-- lateness in the downgrade webhook must never keep a lapsed listing on top.
--
-- plan / plan_until are returned too so the client renders the required
-- "ویژه" chip (see lib/billing/plans.ts: featured placement is labelled,
-- never hidden) instead of re-deriving featured status differently in SQL
-- and in the app.
-- ============================================================================

-- create or replace cannot change the OUT-parameter shape (adding plan,
-- plan_until); drop first.
drop function if exists public.search_businesses(text, text, text, boolean, integer, integer);

create or replace function public.search_businesses(
  q text,
  p_city text default null,
  p_category text default null,
  p_verified_only boolean default false,
  p_limit integer default 40,
  p_offset integer default 0
)
returns table (
  id uuid, ref_no integer, slug text, name text, name_en text, category text, sub_category text,
  tagline text, short_description text, city text, province text, phone text, website text,
  logo_url text, cover_url text, verified_until timestamptz, view_count integer,
  plan text, plan_until timestamptz,
  rank real, total_count bigint
)
language sql
stable
as $$
  with params as (
    select public.fa_normalize(q) as qn,
           public.fa_normalize(public.keyboard_swap(q)) as qs,
           array_remove(regexp_split_to_array(public.fa_normalize(q), '\s+'), '') as words,
           array_remove(regexp_split_to_array(public.fa_normalize(public.keyboard_swap(q)), '\s+'), '') as swords
  ),
  scored as (
    select b.*,
      (b.plan = 'featured' and (b.plan_until is null or b.plan_until >= now())) as is_featured,
      greatest(
        -- literal
        (case when public.fa_normalize(b.name) = p.qn then 10 else 0 end)
      + (case when public.fa_normalize(b.name) like p.qn || '%' then 4 else 0 end)
      + (case when public.fa_normalize(b.name) like '%' || p.qn || '%' then 2 else 0 end)
      + (case when public.fa_normalize(coalesce(b.name_en,'')) like '%' || p.qn || '%' then 2 else 0 end)
      + similarity(public.fa_normalize(b.name), p.qn) * 3
      + similarity(b.search_text, p.qn),
        -- keyboard-swapped, slightly discounted so a literal hit wins ties
        0.9 * (
        (case when public.fa_normalize(b.name) = p.qs then 10 else 0 end)
      + (case when public.fa_normalize(b.name) like p.qs || '%' then 4 else 0 end)
      + (case when public.fa_normalize(b.name) like '%' || p.qs || '%' then 2 else 0 end)
      + (case when public.fa_normalize(coalesce(b.name_en,'')) like '%' || p.qs || '%' then 2 else 0 end)
      + similarity(public.fa_normalize(b.name), p.qs) * 3
      + similarity(b.search_text, p.qs))
      )
      + (case when b.verified_until is not null and b.verified_until > now() then 0.5 else 0 end)
      + least(coalesce(b.view_count, 0), 500) / 5000.0
      as rank
    from public.businesses b, params p
    where b.status in ('APPROVED', 'PUBLISHED')
      and (
        p.qn = ''
        or b.search_text like '%' || p.qn || '%'
        or (cardinality(p.words) > 1 and (select bool_and(b.search_text like '%' || w || '%') from unnest(p.words) w))
        or public.fa_normalize(b.name) % p.qn
        or (cardinality(p.words) = 1 and b.search_text % p.qn)
        -- swapped layout
        or b.search_text like '%' || p.qs || '%'
        or (cardinality(p.swords) > 1 and (select bool_and(b.search_text like '%' || w || '%') from unnest(p.swords) w))
        or public.fa_normalize(b.name) % p.qs
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
  select id, ref_no, slug, name, name_en, category, sub_category, tagline, short_description,
         city, province, phone, website, logo_url, cover_url, verified_until, view_count,
         plan, plan_until,
         rank::real, count(*) over () as total_count
  from scored
  order by is_featured desc, rank desc, name
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;

-- Search v1.1: category label inside the search blob, and multi-word queries
-- match when every word appears somewhere (or is trigram-close), instead of
-- requiring the whole phrase contiguously.
create or replace function public.business_search_text(b public.businesses)
returns text
language sql
stable
as $$
  select public.fa_normalize(
    concat_ws(' ',
      b.name, b.name_en, b.tagline, b.short_description, b.sub_category,
      b.city, b.province, b.address,
      (select c.name || ' ' || c.slug from public.categories c where c.slug = b.category),
      (select string_agg(coalesce(s->>'name','') || ' ' || coalesce(s->>'description',''), ' ')
         from jsonb_array_elements(case when jsonb_typeof(b.services) = 'array' then b.services else '[]'::jsonb end) s)
    )
  );
$$;

update public.businesses b set search_text = public.business_search_text(b);

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
  rank real, total_count bigint
)
language sql
stable
as $$
  with params as (
    select public.fa_normalize(q) as qn,
           array_remove(regexp_split_to_array(public.fa_normalize(q), '\s+'), '') as words
  ),
  scored as (
    select b.*,
      (
        (case when public.fa_normalize(b.name) = p.qn then 10 else 0 end)
      + (case when public.fa_normalize(b.name) like p.qn || '%' then 4 else 0 end)
      + (case when public.fa_normalize(b.name) like '%' || p.qn || '%' then 2 else 0 end)
      + (case when public.fa_normalize(coalesce(b.name_en,'')) like '%' || p.qn || '%' then 2 else 0 end)
      + similarity(public.fa_normalize(b.name), p.qn) * 3
      + similarity(b.search_text, p.qn)
      + (case when b.verified_until is not null and b.verified_until > now() then 0.5 else 0 end)
      + least(coalesce(b.view_count, 0), 500) / 5000.0
      )::real as rank
    from public.businesses b, params p
    where b.status in ('APPROVED', 'PUBLISHED')
      and (
        p.qn = ''
        or b.search_text like '%' || p.qn || '%'
        -- every word present (substring), or the whole thing trigram-close
        or (cardinality(p.words) > 1 and (select bool_and(b.search_text like '%' || w || '%') from unnest(p.words) w))
        or public.fa_normalize(b.name) % p.qn
        or (cardinality(p.words) = 1 and b.search_text % p.qn)
      )
      and (p_city is null or p_city = '' or lower(b.city) = lower(p_city))
      and (p_category is null or p_category = '' or b.category = p_category)
      and (not p_verified_only or (b.verified_until is not null and b.verified_until > now()))
  )
  select id, ref_no, slug, name, name_en, category, sub_category, tagline, short_description,
         city, province, phone, website, logo_url, cover_url, verified_until, view_count,
         rank, count(*) over () as total_count
  from scored
  order by rank desc, name
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;

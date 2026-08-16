-- ============================================================================
-- Migration: metro-aware city filter + category aliases in search
-- Date: 2026-08-16
--
-- "رستوران in Toronto" returned nothing because the filter was
-- lower(city) = 'toronto' and every restaurant sits in North York, Richmond
-- Hill or (409 rows) 'نامشخص'. City filter now expands through city_metro.
-- Category filter honours the legacy free-text spellings via category_aliases,
-- the same table the web app's getCategoryAliases() encodes today.
-- ============================================================================

create table if not exists public.city_metro (
  city_en  text primary key,
  metro_en text not null
);
insert into public.city_metro (city_en, metro_en) values
  ('Toronto','Toronto'),('North York','Toronto'),('Richmond Hill','Toronto'),('Thornhill','Toronto'),
  ('Markham','Toronto'),('Vaughan','Toronto'),('Newmarket','Toronto'),('Aurora','Toronto'),
  ('Mississauga','Toronto'),('Downtown Toronto','Toronto'),('Scarborough','Toronto'),('Etobicoke','Toronto'),
  ('East York','Toronto'),('Concord','Toronto'),('Maple','Toronto'),('Woodbridge','Toronto'),('Keswick','Toronto'),
  ('Vancouver','Vancouver'),('North Vancouver','Vancouver'),('West Vancouver','Vancouver'),('Burnaby','Vancouver'),
  ('Coquitlam','Vancouver'),('Richmond','Vancouver'),('Surrey','Vancouver'),('Port Moody','Vancouver'),
  ('Montreal','Montreal'),('Laval','Montreal'),('Longueuil','Montreal'),('Brossard','Montreal'),
  ('Calgary','Calgary'),('Ottawa','Ottawa'),('Gatineau','Ottawa'),('Kanata','Ottawa'),
  ('Edmonton','Edmonton'),('Winnipeg','Winnipeg'),('Halifax','Halifax'),('Dartmouth','Halifax'),('Bedford','Halifax')
on conflict (city_en) do update set metro_en = excluded.metro_en;
alter table public.city_metro enable row level security;
drop policy if exists "city metro is public" on public.city_metro;
create policy "city metro is public" on public.city_metro for select to anon, authenticated using (true);

create table if not exists public.category_aliases (
  alias         text primary key,
  category_slug text not null
);
insert into public.category_aliases (alias, category_slug) values
  ('medical','medical-clinic'),('پزشکی، دندانپزشکی و سلامت','medical-clinic'),('پزشکی','medical-clinic'),
  ('food','restaurant-cafe'),('رستوران، کافه و غذا','restaurant-cafe'),('رستوران','restaurant-cafe'),
  ('legal','legal-immigration'),('حقوقی و وکالت','legal-immigration'),
  ('real_estate','real-estate-mortgage'),('مشاور املاک','real-estate-mortgage'),('املاک و وام','real-estate-mortgage'),
  ('financial','accounting-tax'),('مالی، حسابداری و بیمه','accounting-tax'),
  ('beauty','beauty-wellness'),('آرایشگری و زیبایی','beauty-wellness'),
  ('retail','iranian-grocery'),('فروشگاه و خرده‌فروشی','iranian-grocery'),
  ('construction','skilled-trades'),('ساختمان و تاسیسات','skilled-trades')
on conflict (alias) do update set category_slug = excluded.category_slug;
alter table public.category_aliases enable row level security;
drop policy if exists "category aliases are public" on public.category_aliases;
create policy "category aliases are public" on public.category_aliases for select to anon, authenticated using (true);

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
           public.fa_normalize(public.keyboard_swap(q)) as qs,
           array_remove(regexp_split_to_array(public.fa_normalize(q), '\s+'), '') as words,
           array_remove(regexp_split_to_array(public.fa_normalize(public.keyboard_swap(q)), '\s+'), '') as swords
  ),
  scored as (
    select b.*,
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
         rank::real, count(*) over () as total_count
  from scored
  order by rank desc, name
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;

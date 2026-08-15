-- Search v1.3: forgive the wrong keyboard layout. On an RTL device the
-- keyboard opens in Persian; a user typing "dental" produces "یثدفشم".
-- (Seen live on the simulator.) Map Persian-standard layout ↔ QWERTY both
-- ways and search the swapped form as well when the literal one is weak.
create or replace function public.keyboard_swap(t text)
returns text
language sql
immutable
as $$
  -- Persian standard layout, letter positions of QWERTY a..z:
  --   q w e r t y u i o p  a s d f g h j k l  z x c v b n m
  --   ض ص ث ق ف غ ع ه خ ح  ش س ی ب ل ا ت ن م  ظ ط ز ر ذ د ئ
  select translate(lower(coalesce(t,'')),
    'qwertyuiopasdfghjklzxcvbnm' || 'ضصثقفغعهخحشسیبلاتنمظطزرذدئ',
    'ضصثقفغعهخحشسیبلاتنمظطزرذدئ' || 'qwertyuiopasdfghjklzxcvbnm');
$$;
grant execute on function public.keyboard_swap(text) to anon, authenticated;

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
      and (p_city is null or p_city = '' or lower(b.city) = lower(p_city))
      and (p_category is null or p_category = '' or b.category = p_category)
      and (not p_verified_only or (b.verified_until is not null and b.verified_until > now()))
  )
  select id, ref_no, slug, name, name_en, category, sub_category, tagline, short_description,
         city, province, phone, website, logo_url, cover_url, verified_until, view_count,
         rank::real, count(*) over () as total_count
  from scored
  order by rank desc, name
  limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset);
$$;

-- ============================================================================
-- Source: supabase/migrations/20260830090000_search.sql
-- Version: 1.0.0 — 2026-08-15
-- Why: Real search — the open P0. Persian-aware (Arabic yeh/kaf folded to
--      Persian, Persian/Arabic-Indic digits to ASCII, tatweel and diacritics
--      dropped, case-folded), trigram-indexed, ranked (name match beats body
--      match, verified beats unverified), filterable by city/category, and
--      logged so zero-result queries tell us what people want.
-- ============================================================================
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Normalise text the way a Persian keyboard would confuse it.
create or replace function public.fa_normalize(t text)
returns text
language sql
immutable
as $$
  select lower(
    translate(
      regexp_replace(coalesce(t, ''), '[ً-ْـ]', '', 'g'),   -- harakat + tatweel
      'يكةۀ۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
      'یکهه01234567890123456789'
    )
  );
$$;

-- One flattened, normalised blob per row. Services is JSON; pull the names.
create or replace function public.business_search_text(b public.businesses)
returns text
language sql
immutable
as $$
  select public.fa_normalize(
    concat_ws(' ',
      b.name, b.name_en, b.tagline, b.short_description, b.sub_category,
      b.city, b.province, b.address,
      (select string_agg(coalesce(s->>'name','') || ' ' || coalesce(s->>'description',''), ' ')
         from jsonb_array_elements(case when jsonb_typeof(b.services) = 'array' then b.services else '[]'::jsonb end) s)
    )
  );
$$;

alter table public.businesses
  add column if not exists search_text text;

update public.businesses b set search_text = public.business_search_text(b);

create or replace function public.businesses_set_search_text()
returns trigger language plpgsql as $$
begin
  new.search_text := public.business_search_text(new);
  return new;
end $$;

drop trigger if exists businesses_search_text on public.businesses;
create trigger businesses_search_text
  before insert or update of name, name_en, tagline, short_description, sub_category, city, province, address, services
  on public.businesses
  for each row execute function public.businesses_set_search_text();

create index if not exists businesses_search_text_trgm on public.businesses using gin (search_text gin_trgm_ops);
create index if not exists businesses_name_norm_trgm on public.businesses using gin (public.fa_normalize(name) gin_trgm_ops);

-- Zero-result and all-result logging. Anonymous insert allowed; no reads.
create table if not exists public.search_queries (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  q_norm text not null,
  city text,
  category text,
  result_count integer not null,
  source text not null default 'web',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists search_queries_created_at on public.search_queries (created_at desc);
create index if not exists search_queries_zero on public.search_queries (created_at desc) where result_count = 0;
alter table public.search_queries enable row level security;
drop policy if exists "anyone may log a search" on public.search_queries;
create policy "anyone may log a search" on public.search_queries for insert to anon, authenticated with check (true);
drop policy if exists "admins read searches" on public.search_queries;
create policy "admins read searches" on public.search_queries for select to authenticated using (public.is_admin(auth.uid()));

-- The search itself. Returns public card columns + a rank. SECURITY INVOKER,
-- so RLS still decides which rows a caller may see.
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
    select public.fa_normalize(q) as qn
  ),
  scored as (
    select b.*,
      (
        -- exact/prefix name hits dominate, then trigram similarity on name, then body
        (case when public.fa_normalize(b.name) = p.qn then 10 else 0 end)
      + (case when public.fa_normalize(b.name) like p.qn || '%' then 4 else 0 end)
      + (case when public.fa_normalize(b.name) like '%' || p.qn || '%' then 2 else 0 end)
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
        or b.search_text % p.qn
        or public.fa_normalize(b.name) % p.qn
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

grant execute on function public.search_businesses(text, text, text, boolean, integer, integer) to anon, authenticated;
grant execute on function public.fa_normalize(text) to anon, authenticated;

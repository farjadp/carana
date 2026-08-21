-- ============================================================================
-- Migration: smart search — announcements become searchable + AI expansion cache
-- Date: 2026-08-19
--
-- Two pieces, both serving the same ask ("هوس آلبالو کردم" should find the
-- grocery that stocks sour cherries or just announced them):
--
--   1. search_announcements(q, p_limit) — active announcements were never
--      searchable at all. A business that posted «آلبالو ترش رسید» yesterday
--      is the single best answer to that query, and until now search could
--      not see it. Same normalisation + keyboard-swap machinery as
--      search_businesses; runs as invoker so the existing public-read RLS
--      policy (announcements of APPROVED/PUBLISHED businesses only) is what
--      decides visibility, not this function.
--
--   2. search_ai_expansions — the cache/ledger for the LLM
--      query-understanding layer (apps/web/lib/search/smart.ts). One row per
--      normalised query, written once, reused forever. It is deliberately
--      both the cache AND the spend counter: the row is inserted BEFORE the
--      model call (an abandoned call still cost money — the ai_usage
--      lesson), and the daily-cap check counts rows here, in the database,
--      not in a per-instance memory map. No client-facing RLS policies on
--      purpose: only the service role reads or writes it.
-- ============================================================================

-- ------------------------------------------------ 1. announcements search
-- Trigram index over the normalised text. fa_normalize is IMMUTABLE
-- (20260830090000_search.sql), so the expression index is legal.
create index if not exists business_announcements_search_trgm
  on public.business_announcements
  using gin (public.fa_normalize(title || ' ' || coalesce(body, '')) gin_trgm_ops);

create or replace function public.search_announcements(q text, p_limit integer default 6)
returns table (
  announcement_id uuid,
  announcement_title text,
  announcement_body text,
  announcement_created_at timestamptz,
  announcement_expires_at timestamptz,
  business_id uuid,
  slug text,
  name text,
  category text,
  city text,
  province text,
  logo_url text,
  verified_until timestamptz,
  plan text,
  plan_until timestamptz
)
language sql
stable
as $$
  with p as (
    select public.fa_normalize(q) as qn,
           public.fa_normalize(public.keyboard_swap(q)) as qs,
           array_remove(regexp_split_to_array(public.fa_normalize(q), '\s+'), '') as words
  )
  select
    a.id, a.title, a.body, a.created_at, a.expires_at,
    b.id, b.slug, b.name, b.category, b.city, b.province, b.logo_url,
    b.verified_until, b.plan, b.plan_until
  from public.business_announcements a
  join public.businesses b on b.id = a.business_id
  cross join p
  where b.status in ('APPROVED', 'PUBLISHED')
    -- Live announcements only: unexpired, and not older than 90 days. An
    -- expired discount surfacing in search would be the exact dishonesty
    -- the announcement banner already avoids.
    and (a.expires_at is null or a.expires_at > now())
    and a.created_at > now() - interval '90 days'
    and p.qn <> ''
    and (
      -- whole query as substring, literal or keyboard-swapped
      public.fa_normalize(a.title || ' ' || coalesce(a.body, '')) like '%' || p.qn || '%'
      or public.fa_normalize(a.title || ' ' || coalesce(a.body, '')) like '%' || p.qs || '%'
      -- multi-word: all but one word present. Persian search wishes carry a
      -- filler word («میخوام», «کجا») that no announcement contains; requiring
      -- every word made «طراحی سایت میخوام» miss «۲۰٪ تخفیف طراحی وب سایت».
      or (cardinality(p.words) > 1 and (
            select count(*) from unnest(p.words) w
            where public.fa_normalize(a.title || ' ' || coalesce(a.body, '')) like '%' || w || '%'
          ) >= greatest(2, cardinality(p.words) - 1))
      -- single word: trigram-close to the title (typo tolerance)
      or (cardinality(p.words) = 1 and public.fa_normalize(a.title) % p.qn)
    )
  order by a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 20));
$$;

-- --------------------------------------------- 2. AI expansion cache/ledger
create table if not exists public.search_ai_expansions (
  -- fa-normalised query text; the JS side normalises identically before lookup.
  q_norm       text primary key,
  -- What the model extracted. Empty arrays are a valid, cached "nothing
  -- useful" answer — caching failure stops one bad query from being retried
  -- against the paid model on every page load.
  terms        text[] not null default '{}',
  categories   text[] not null default '{}',
  -- One short Persian sentence shown to the visitor. Never asserts a
  -- business HAS the item — the prompt forbids availability claims.
  reason       text,
  model        text,
  -- How many searches were served from this row after it was created.
  hit_count    integer not null default 0,
  -- 'pending' rows were inserted before the model call and never completed
  -- (crash, timeout). They still count against the daily cap.
  status       text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.search_ai_expansions is
  'Cache + spend ledger for LLM search-query expansion. Service-role only.
   Row inserted before the model call; daily cap = count of today''s rows.';

create index if not exists search_ai_expansions_created_idx
  on public.search_ai_expansions (created_at desc);

alter table public.search_ai_expansions enable row level security;
-- No policies: anon and authenticated can neither read nor write. Every
-- access goes through the server with the service role.

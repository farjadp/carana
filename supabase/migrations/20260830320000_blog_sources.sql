-- ============================================================================
-- Migration: blog sources — external topic signals, and syndication targets
-- Date: 2026-08-24
--
-- Two additions to the blog:
--
-- 1. SOURCES. The generator's topics have so far come only from our own data
--    (categories, city counts, zero-result searches). That is a good well but
--    a slow one: it has no idea that Statistics Canada published school-cost
--    numbers this morning. `blog_sources` registers external Persian-Canadian
--    publications, `blog_source_articles` is the ledger of every article we
--    have seen from them.
--
--    The ledger is the point, not a cache. It answers "is this new to us?"
--    (so a daily run never writes the same story twice) and it is what makes
--    "if there are fewer than N new ones, reach back into the archive"
--    possible — an old article is simply one we have not marked `used`.
--
--    What we take from a source is the SUBJECT and the FACTS, never the
--    prose. `blog_posts.source_article_id` and the existing `sources` jsonb
--    keep the attribution attached to the row, so the post can cite it and an
--    admin can always see where a topic came from.
--
-- 2. SYNDICATION. `blog_syndications` is one row per (post, channel). It
--    exists so "posted to Telegram" is a fact in the database rather than a
--    thing we hope happened, and so a retry cannot double-post — the unique
--    key on (post_id, channel) is the whole safety mechanism.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Registry of external sources
-- ---------------------------------------------------------------------------
create table if not exists public.blog_sources (
  slug            text primary key,
  name            text not null,
  home_url        text not null,
  kind            text not null default 'wordpress' check (kind in ('wordpress')),
  api_base        text,                              -- e.g. https://atash.ca/wp-json/wp/v2
  include_categories int[] not null default '{}',    -- source-side category ids; empty = all
  exclude_categories int[] not null default '{}',
  enabled         boolean not null default true,
  fresh_days      int not null default 21,           -- an article newer than this counts as "new"
  weight          int not null default 1,            -- share of a run when several sources are on
  notes           text,
  created_at      timestamptz not null default now()
);

-- atash.ca — Persian-language news for Iranians in Canada. WordPress; the
-- REST collection is the honest enumeration (the Yoast sitemap is partial).
-- `advertorial` (121) is excluded: those are paid placements, not news, and
-- rewriting someone's ad is both useless and unfair.
insert into public.blog_sources (slug, name, home_url, kind, api_base, exclude_categories, fresh_days, notes)
values (
  'atash',
  'آتش آنلاین',
  'https://atash.ca',
  'wordpress',
  'https://atash.ca/wp-json/wp/v2',
  array[121],
  21,
  'Topic and fact signal only. We never reuse their prose; every post we write from an atash topic cites the original.'
)
on conflict (slug) do update set
  name = excluded.name, home_url = excluded.home_url, api_base = excluded.api_base,
  exclude_categories = excluded.exclude_categories, notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- 2. Ledger of seen articles
-- ---------------------------------------------------------------------------
create table if not exists public.blog_source_articles (
  id            uuid primary key default gen_random_uuid(),
  source_slug   text not null references public.blog_sources (slug) on delete cascade,
  external_id   text not null,                -- the source's own post id
  url           text not null,
  title         text,
  excerpt       text,
  published_at  timestamptz,
  first_seen_at timestamptz not null default now(),
  status        text not null default 'new' check (status in ('new', 'used', 'skipped', 'failed')),
  reason        text,                          -- why skipped / how it failed
  post_id       uuid references public.blog_posts (id) on delete set null,
  unique (source_slug, external_id)
);

create index if not exists blog_source_articles_pick_idx
  on public.blog_source_articles (source_slug, status, published_at desc);

-- ---------------------------------------------------------------------------
-- 3. Post columns: provenance + the answer block answer engines quote
-- ---------------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists source_article_id uuid references public.blog_source_articles (id) on delete set null;

-- 40–60 Persian words that answer the article's question outright, rendered
-- as its own block at the top. This is the GEO/AIO unit: the passage an
-- answer engine can lift whole and attribute.
alter table public.blog_posts
  add column if not exists key_takeaway text;

-- ---------------------------------------------------------------------------
-- 4. Syndication ledger
-- ---------------------------------------------------------------------------
create table if not exists public.blog_syndications (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.blog_posts (id) on delete cascade,
  channel     text not null check (channel in ('telegram', 'linkedin')),
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  external_id text,                            -- message id / share urn
  url         text,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  unique (post_id, channel)                    -- the anti-double-post guarantee
);

create index if not exists blog_syndications_post_idx on public.blog_syndications (post_id);

-- ---------------------------------------------------------------------------
-- 5. RLS — all three are admin-only; nothing here is public
-- ---------------------------------------------------------------------------
alter table public.blog_sources          enable row level security;
alter table public.blog_source_articles  enable row level security;
alter table public.blog_syndications     enable row level security;

drop policy if exists "blog sources admin"          on public.blog_sources;
drop policy if exists "blog source articles admin"  on public.blog_source_articles;
drop policy if exists "blog syndications admin"     on public.blog_syndications;

create policy "blog sources admin"         on public.blog_sources         for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "blog source articles admin" on public.blog_source_articles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "blog syndications admin"    on public.blog_syndications    for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

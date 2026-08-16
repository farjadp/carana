-- ============================================================================
-- Migration: blog — categories, posts, generation runs
-- Date: 2026-08-16
--
-- The content layer for SEO/GEO. Posts are written by the generator
-- (lib/blog/generate.ts) into `review`; an admin publishes, or the cron does
-- when BLOG_AUTO_PUBLISH is on. Public reads only published rows.
-- ============================================================================

create table if not exists public.blog_categories (
  slug        text primary key,
  name        text not null,           -- Persian label
  name_en     text not null,
  description text,
  display_order int not null default 0
);

insert into public.blog_categories (slug, name, name_en, description, display_order) values
  ('guides',     'راهنمای عملی',        'Practical guides',     'چطور انتخاب کنم، چه بپرسم، چه‌قدر بدهم — راهنماهای قدم‌به‌قدم برای ایرانیانِ کانادا.', 1),
  ('business',   'کسب‌وکار در کانادا',  'Business in Canada',   'ثبت شرکت، مالیات، بازاریابی محلی و آنچه صاحبان کسب‌وکار ایرانی باید بدانند.', 2),
  ('city-life',  'زندگی در شهرها',      'City life',            'محله‌ها، بازارها، مناسبت‌ها و زندگی روزمره‌ی ایرانی در شهرهای کانادا.', 3),
  ('culture',    'فرهنگ و مناسبت‌ها',   'Culture & occasions',  'نوروز، یلدا، مهرگان و مناسبت‌های ایرانی در کانادا — کجا، چطور، با چه کسب‌وکارهایی.', 4),
  ('newcomers',  'تازه‌واردها',          'Newcomers',            'اولین ماه‌ها: مدرک، بیمه، بانک، خانه، مدرسه — و کسب‌وکارهای ایرانی که کار را ساده می‌کنند.', 5),
  ('data',       'داده و روند',          'Data & trends',        'آنچه اعداد چارانا می‌گویند: چه کسب‌وکارهایی کجا رشد می‌کنند، مردم دنبال چه می‌گردند.', 6),
  ('product',    'اخبار چارانا',         'čārana updates',       'چه ساخته‌ایم و چرا.', 7)
on conflict (slug) do update set name = excluded.name, name_en = excluded.name_en, description = excluded.description, display_order = excluded.display_order;

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  title_en        text,                    -- English title for GEO / og:locale:alternate
  excerpt         text,                    -- 1–2 Persian sentences
  summary_en      text,                    -- 2–3 English sentences, quoted by answer engines
  body_md         text not null,           -- markdown; inline images as ![alt](url)
  cover_url       text,
  cover_alt       text,
  category_slug   text references public.blog_categories (slug) on delete set null,
  tags            text[] not null default '{}',
  status          text not null default 'review' check (status in ('draft','review','published','archived')),
  published_at    timestamptz,
  author_name     text not null default 'تیم چارانا',
  reading_minutes int,
  faq             jsonb,                   -- [{q,a}] → FAQPage
  sources         jsonb,                   -- [{title,url}] cited in the body
  internal_links  text[] not null default '{}',  -- site paths linked from the body
  ai_model        text,
  topic_seed      text,                    -- why this topic was chosen (for the admin)
  admin_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists blog_posts_published_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_idx  on public.blog_posts (category_slug);

create or replace function public.blog_posts_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before update on public.blog_posts for each row execute function public.blog_posts_touch();

-- One row per generator invocation, so the admin can see what ran and what failed.
create table if not exists public.blog_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  requested   int not null,
  created     int not null default 0,
  errors      jsonb,
  notes       text
);

alter table public.blog_categories enable row level security;
alter table public.blog_posts      enable row level security;
alter table public.blog_runs       enable row level security;

drop policy if exists "blog categories public"   on public.blog_categories;
drop policy if exists "blog posts public read"   on public.blog_posts;
drop policy if exists "blog posts admin all"     on public.blog_posts;
drop policy if exists "blog runs admin read"     on public.blog_runs;

create policy "blog categories public" on public.blog_categories for select to anon, authenticated using (true);
create policy "blog posts public read"  on public.blog_posts for select to anon, authenticated using (status = 'published' or public.is_admin(auth.uid()));
create policy "blog posts admin all"    on public.blog_posts for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "blog runs admin read"    on public.blog_runs for select to authenticated using (public.is_admin(auth.uid()));

-- Public bucket for post images (generated server-side with the service role).
insert into storage.buckets (id, name, public) values ('blog', 'blog', true) on conflict (id) do nothing;
drop policy if exists "blog images public read" on storage.objects;
create policy "blog images public read" on storage.objects for select using (bucket_id = 'blog');

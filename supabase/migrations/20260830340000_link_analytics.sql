-- ============================================================================
-- Migration: analytics spine — event registry, link events, daily rollups
-- Date: 2026-08-24
--
-- Farjad's direction, 24 Aug: analytics is something we SELL, differentiated
-- across packages, and it has to stay extendable. That turns "count the link
-- clicks" into three layers, and each layer exists to fix a specific way the
-- current `business_events` cannot grow.
--
-- WHY NOT JUST EXTEND business_events
--   Its `business_id` is NOT NULL, and its RLS policy and both of its indexes
--   are built on that column. A link page owned by an individual has no
--   business at all, so the constraint would have to come off a live,
--   high-traffic table. Granularity differs too — a click is on an ITEM — so
--   every existing row would gain two forever-null columns, and
--   `business_event_summary` would silently start returning different numbers
--   to a dashboard nobody warned. So: a separate table, and ONE read view
--   over both. The view is also the seam that later lets the two collapse
--   into a single spine without the dashboard noticing.
--
-- WHY event_type IS NOT A CHECK CONSTRAINT
--   This is the concrete lesson from `business_events`:
--     event_type text not null check (event_type in ('view','call',...))
--   Every new metric is an ALTER on a huge table. Here the column references
--   a registry instead, so a new metric is one INSERT — no migration, no
--   deploy, no lock. (Contrast `link_items.kind`, which stays a CHECK on
--   purpose: a new item kind always needs render code shipped with it, so it
--   is never a data-only change.)
--
-- WHY ROLLUPS EXIST FROM DAY ONE
--   Long history is only sellable if storing it is cheap. Raw events are kept
--   90 days and dropped; `analytics_daily` is kept forever. "12 months of
--   history" in Premium then costs almost nothing.
--
-- WHY THE PLAN GATES THE QUERY, NOT THE DATA
--   Everyone's events are recorded in full. The read function clamps the
--   window by what the caller is entitled to. Upgrading therefore reveals
--   REAL history instead of an empty chart — and per the honesty rule, a
--   locked window may only be teased when the data behind it actually exists.
--
-- WHY BOTS ARE FLAGGED AND NOT DROPPED
--   "1,200 views" where 900 are crawlers is a false number in the UI. Dropping
--   them silently makes the drop unauditable. So they are stored, marked, and
--   excluded from every count by default.
--
-- Env / Identity: no secrets. Inserts come from the ingest endpoint with the
--      service role; reads go through RLS or the summary function.
-- ============================================================================

-- --------------------------------------------------------- 1. type registry
create table if not exists public.event_types (
  key          text primary key,
  subject_kind text not null check (subject_kind in ('business', 'link_page')),
  label_fa     text not null,
  label_en     text not null,
  -- Which plan feature a viewer needs before this metric is shown. Null means
  -- everyone sees it. This is the ONLY place packaging of a metric is stated.
  min_feature  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.event_types is
  'The catalogue of measurable things. Adding a metric is an INSERT here plus
   an entry in the metric catalogue in @goplaza/core — never a migration. If a
   new metric needs schema changes, the design is wrong.';

insert into public.event_types (key, subject_kind, label_fa, label_en, min_feature) values
  ('link_view',   'link_page', 'بازدید صفحه',      'Page view',    null),
  ('link_click',  'link_page', 'کلیک روی لینک',    'Link click',   null),
  ('qr_scan',     'link_page', 'اسکن کیوآر',       'QR scan',      'insights_basic'),
  ('lead_submit', 'link_page', 'ثبت فرم تماس',     'Lead captured', 'insights_basic')
on conflict (key) do nothing;

-- ----------------------------------------------------------- 2. raw events
create table if not exists public.link_events (
  id           bigserial primary key,
  page_id      uuid not null references public.link_pages (id) on delete cascade,
  item_id      uuid references public.link_items (id) on delete set null,
  event_type   text not null references public.event_types (key),

  -- Dimensions that can only ever be captured NOW. None of these is
  -- backfillable: a referrer or a device class not written at request time is
  -- gone. They are exactly what makes the $13 tier worth buying, so they are
  -- collected from the first day even though nothing reads them yet.
  referrer_host text,
  utm           jsonb,
  device        text check (device is null or device in ('mobile', 'desktop', 'tablet', 'bot')),
  city          text,
  source        text not null default 'web' check (source in ('web', 'mobile')),

  -- sha256(ip + user-agent + date + salt), truncated — byte-for-byte the same
  -- convention as business_events.visitor_hash. Two hashing schemes would be
  -- two different definitions of "unique visitor".
  visitor_hash  text,

  bot           boolean not null default false,
  props         jsonb not null default '{}'::jsonb,

  created_at    timestamptz not null default now()
);

create index if not exists link_events_page_time_idx on public.link_events (page_id, created_at desc);
create index if not exists link_events_item_idx      on public.link_events (item_id, created_at desc) where item_id is not null;
create index if not exists link_events_rollup_idx    on public.link_events (created_at) where not bot;

comment on column public.link_events.props is
  'Room for dimensions we have not thought of. No personal data may go in it,
   and a key is only indexed once something actually queries it.';
comment on column public.link_events.bot is
  'Crawler traffic is recorded and marked, never silently discarded — a count
   we cannot audit is a count we cannot defend.';

-- ------------------------------------------------------------ 3. rollups
create table if not exists public.analytics_daily (
  subject_kind text not null check (subject_kind in ('business', 'link_page')),
  subject_id   uuid not null,
  day          date not null,
  event_type   text not null references public.event_types (key),
  -- '' means "no breakdown, the total for the day".
  dimension    text not null default '',
  value        text not null default '',
  n            integer not null,
  uniques      integer not null,
  updated_at   timestamptz not null default now(),
  primary key (subject_kind, subject_id, day, event_type, dimension, value)
);

create index if not exists analytics_daily_subject_idx
  on public.analytics_daily (subject_kind, subject_id, day desc);

comment on table public.analytics_daily is
  'Permanent. Raw events expire at 90 days (see prune_link_events); these do
   not. This is what makes "12 months of history" a cheap thing to sell.';

-- Recompute one day, every dimension, idempotently. Re-running it for a day
-- that has already been rolled up produces the same rows — which is what lets
-- it be retried after a failed cron run without double counting.
create or replace function public.roll_up_link_day(p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer := 0;
begin
  delete from public.analytics_daily
   where subject_kind = 'link_page' and day = p_day;

  insert into public.analytics_daily (subject_kind, subject_id, day, event_type, dimension, value, n, uniques)
  select 'link_page', page_id, p_day, event_type, d.dimension, d.value,
         count(*), count(distinct visitor_hash)
    from public.link_events e
    cross join lateral (values
      ('',         ''),
      ('item',     coalesce(e.item_id::text, '')),
      ('referrer', coalesce(e.referrer_host, '')),
      ('device',   coalesce(e.device, '')),
      ('city',     coalesce(e.city, ''))
    ) as d(dimension, value)
   where not e.bot
     -- Explicit casts: an implicit date/timestamptz comparison silently uses
     -- the server timezone. NOTE a real product question left open here — a
     -- UTC day boundary cuts a Toronto evening in half, so "yesterday" in the
     -- dashboard is not the owner's yesterday. Decide before selling the
     -- daily chart; changing it later invalidates every stored rollup.
     and e.created_at >= p_day::timestamptz
     and e.created_at <  (p_day + 1)::timestamptz
     and (d.dimension = '' or d.value <> '')
   group by page_id, event_type, d.dimension, d.value;

  get diagnostics written = row_count;
  return written;
end $$;

comment on function public.roll_up_link_day(date) is
  'Idempotent by construction: it deletes the day before rewriting it, so a
   retried cron run cannot double count.';

-- Retention. Raw rows past 90 days are gone; their rollups are not.
create or replace function public.prune_link_events(p_keep_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted integer;
begin
  delete from public.link_events
   where created_at < now() - (greatest(30, p_keep_days) || ' days')::interval;
  get diagnostics deleted = row_count;
  return deleted;
end $$;

-- ------------------------------------------------- 4. one read surface
-- security_invoker so the caller's RLS still decides what they may see. A
-- plain view would run with the definer's rights and quietly hand every
-- business's traffic to anyone who selected from it.
drop view if exists public.owner_events;
create view public.owner_events
with (security_invoker = true)
as
  select 'business'::text as subject_kind,
         e.business_id     as subject_id,
         null::uuid        as item_id,
         e.event_type,
         e.source,
         e.referrer        as referrer_host,
         null::text        as device,
         null::text        as city,
         e.visitor_hash,
         false             as bot,
         e.created_at
    from public.business_events e
  union all
  select 'link_page'::text, l.page_id, l.item_id, l.event_type, l.source,
         l.referrer_host, l.device, l.city, l.visitor_hash, l.bot, l.created_at
    from public.link_events l;

comment on view public.owner_events is
  'The single row-level read surface over both event tables. The dashboard
   reads this, not either table, so the two can later merge into one spine
   without the dashboard changing.';

-- The summary the dashboards call. The WINDOW is decided by the caller from
-- entitlements computed in @goplaza/core — SQL does not re-derive plan maths,
-- it only refuses to exceed a hard ceiling.
create or replace function public.link_page_summary(
  p_page_id   uuid,
  p_days      integer default 7,
  p_dimension text default ''
)
returns table (day date, event_type text, value text, n bigint, uniques bigint)
language sql
stable
security invoker
as $$
  select d.day, d.event_type, d.value, d.n::bigint, d.uniques::bigint
    from public.analytics_daily d
   where d.subject_kind = 'link_page'
     and d.subject_id   = p_page_id
     and d.dimension    = coalesce(p_dimension, '')
     and d.day >= (now() - (greatest(1, least(p_days, 730)) || ' days')::interval)::date
   order by d.day;
$$;

grant execute on function public.link_page_summary(uuid, integer, text) to authenticated;

-- ------------------------------------------------------------------ 5. RLS
alter table public.link_events    enable row level security;
alter table public.analytics_daily enable row level security;
alter table public.event_types    enable row level security;

drop policy if exists "link events owner read"     on public.link_events;
drop policy if exists "link events admin read"     on public.link_events;
drop policy if exists "analytics owner read"       on public.analytics_daily;
drop policy if exists "analytics admin read"       on public.analytics_daily;
drop policy if exists "event types read"           on public.event_types;

-- Read-only for humans everywhere. Writes are service-role only, from the
-- ingest endpoint and the rollup cron — the same rule billing follows: a
-- number a customer can write themselves is not a measurement.
create policy "link events owner read" on public.link_events for select to authenticated
  using (exists (select 1 from public.link_pages p
                 where p.id = page_id and p.owner_user_id = auth.uid()));

create policy "link events admin read" on public.link_events for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "analytics owner read" on public.analytics_daily for select to authenticated
  using (
    (subject_kind = 'link_page' and exists (
      select 1 from public.link_pages p
      where p.id = subject_id and p.owner_user_id = auth.uid()))
    or
    (subject_kind = 'business' and exists (
      select 1 from public.businesses b
      where b.id = subject_id and b.owner_user_id = auth.uid()))
  );

create policy "analytics admin read" on public.analytics_daily for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "event types read" on public.event_types for select to anon, authenticated
  using (is_active);

-- ============================================================================
-- Migration: channels — «کانال‌ها و گروه‌ها»
-- Date: 2026-08-26
-- Design: docs/15-channels-directory.md (six forks decided by Farjad on 26 Aug)
--
-- A directory of Telegram channels/groups and WhatsApp groups serving the
-- community. Any subject. Free, with no plan gate — nothing here may appear in
-- plans.ts, on /pricing or on /features.
--
-- Four things in this file are load-bearing.
--
-- 1. THE AXIS IS metrics_source, NOT platform. The useful distinction is not
--    Telegram vs WhatsApp — it is "we fetched this number" vs "somebody typed
--    it". Plenty of Telegram entries are unmeasurable: preview can be switched
--    off, and an invite-link channel exposes nothing at all. Every WhatsApp row
--    is unmeasurable forever, because there is no API. If the schema keyed on
--    platform, every read site would re-derive this rule and one of them would
--    eventually print a claimed number as if we had measured it.
--
--    The two CHECKs below are what make that unrepresentable rather than
--    merely discouraged: a measured row cannot exist without the date it was
--    measured, and a declared row cannot exist without an expiry.
--
-- 2. ACTIVITY IS NOT A COLUMN. active / quiet / dormant / unknown is computed
--    from last_post_at at read time by channelActivity() in @goplaza/core —
--    the same rule expires_at, verified_until and plan_until already follow.
--    A stored verdict is a verdict that can go stale, and staleness is the
--    exact thing this section exists to expose. No cron keeps it honest.
--
-- 3. WE STORE NO CHANNEL CONTENT. There is no column for a post, a caption or
--    a preview, and there is not going to be one. That keeps someone else's
--    scam post off goplaza.ca and lets this ship without a content-moderation
--    layer we do not have. The cron reads metadata and throws the rest away.
--
-- 4. verified IS NOT measured, and this migration deliberately adds no
--    verified column at all. "We can read this channel's public page" and
--    "this person proved they own it" are different claims; the second one
--    needs the phase-2 bot. Adding the column now would mean four read sites
--    depending on a meaning we would then have to change.
--
-- Env / Identity: no secrets. Public reads go through RLS; every write is a
--      server action or the metrics cron, both with the service role.
-- ============================================================================

-- --------------------------------------------------------------- 1. taxonomy
-- Its own taxonomy, not the business categories. «رستوران» and «آرایشگاه» do
-- not describe a news channel, an immigration group or a city chat; filing
-- these under the directory's categories would put every entry in «سایر».
create table if not exists public.channel_categories (
  slug        text primary key,
  name_fa     text not null,
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.channel_categories (slug, name_fa, description, position) values
  ('news',        'اخبار و رسانه',    'خبر ایران و کانادا، رسانه‌های فارسی‌زبان',                 1),
  ('immigration', 'مهاجرت و ویزا',    'اقامت، تحصیل، کار، پرونده‌های مهاجرتی',                    2),
  ('marketplace', 'خرید و فروش',      'نیازمندی‌ها، اجاره، وسایل دست دوم',                        3),
  ('jobs',        'کاریابی',          'فرصت‌های شغلی و کاریابی',                                  4),
  ('city',        'شهرها',            'گروه‌های محلی یک شهر یا محله',                             5),
  ('education',   'آموزش',            'زبان، مهارت، دوره و کلاس',                                 6),
  ('community',   'اجتماعی و فرهنگی', 'رویداد، هنر، ورزش، انجمن‌ها',                              7),
  ('other',       'سایر',             'هر چیزی که در دسته‌های بالا جا نمی‌گیرد',                  8)
on conflict (slug) do nothing;

alter table public.channel_categories enable row level security;

drop policy if exists "Channel categories are public" on public.channel_categories;
create policy "Channel categories are public"
on public.channel_categories for select to anon, authenticated using (true);

-- --------------------------------------------------------------- 2. channels
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users (id) on delete set null,

  -- English, unique, per the standing URL rule. Built with latinSlug() from
  -- @goplaza/core so a Persian title transliterates rather than vanishing.
  slug text not null unique,

  platform text not null check (platform in ('telegram','whatsapp')),
  kind     text not null check (kind in ('channel','group')),

  title       text not null check (length(btrim(title)) between 2 and 80),
  description text not null check (length(btrim(description)) between 30 and 600),
  language    text not null default 'fa' check (language in ('fa','en','mixed')),

  category_slug text not null references public.channel_categories (slug),
  -- Cities and provinces ARE shared with the rest of the directory: "which
  -- city" is the same question everywhere, and a second vocabulary for it
  -- would mean a second cleanup queue. Both nullable — a national news
  -- channel belongs to no city, and saying «تورنتو» would be a small lie.
  city     text,
  province text,

  -- The canonical joinable link. A public @handle where there is one, because
  -- a handle is stable and an invite link is not.
  join_url    text not null,
  -- Set only when join_url is a public t.me/<name>. Its presence is what puts
  -- a row on the measured side, so it is written by the server action from
  -- telegramUsername(), never typed by the submitter.
  tg_username text check (tg_username is null or tg_username ~ '^[a-z][a-z0-9_]{3,31}$'),

  ------------------------------------------------------------------- metrics
  metrics_source text not null default 'declared'
    check (metrics_source in ('measured','declared')),

  member_count       integer check (member_count is null or member_count >= 0),
  last_post_at       timestamptz,
  posts_last_30d     integer check (posts_last_30d is null or posts_last_30d >= 0),
  metrics_checked_at timestamptz,
  -- Consecutive failures. Reset to 0 by a successful check. Past
  -- CHANNEL_CHECK_FAILURES_MAX the row is demoted to 'declared' and the UI
  -- stops calling its numbers measured — it never silently keeps printing the
  -- last number it happened to see.
  check_failures     integer not null default 0,

  ----------------------------------------------------------------- lifecycle
  status text not null default 'pending_moderation'
    check (status in ('pending_moderation','published','rejected','suspended')),
  moderation_reason text,
  reviewed_by  uuid references auth.users (id) on delete set null,
  reviewed_at  timestamptz,
  published_at timestamptz,

  -- Declared rows expire; measured rows do not. A WhatsApp invite link rots
  -- and nobody tells us, so after 90 days the submitter has to say it is still
  -- there. An unconfirmed row leaves the index and is NOT deleted: that a
  -- group existed and went quiet is information too.
  confirm_by timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A measured number carries the date it was measured. Always. A number
  -- without that date is a claim wearing a fact's clothes.
  constraint channels_measured_has_a_date check (
    metrics_source = 'declared' or metrics_checked_at is not null
  ),
  -- A claim carries its expiry. Always.
  constraint channels_declared_expires check (
    metrics_source = 'measured' or confirm_by is not null
  ),
  -- Only a public username can be measured, and it is the thing we measure.
  constraint channels_measured_needs_a_username check (
    metrics_source = 'declared' or tg_username is not null
  ),
  constraint channels_username_is_telegram check (
    tg_username is null or platform = 'telegram'
  )
);

-- One entry per Telegram channel. A partial index, not a table-level UNIQUE:
-- `unique (platform, tg_username)` would let the same channel be submitted
-- twice under two spellings, and `nulls not distinct` would collapse every
-- WhatsApp row — which all have a null username — into a single allowed row.
create unique index if not exists channels_tg_username_key
  on public.channels (tg_username) where tg_username is not null;

-- The same invite link submitted twice is the same entry twice.
create unique index if not exists channels_join_url_key
  on public.channels (lower(btrim(join_url)));

create index if not exists channels_public_idx    on public.channels (status, last_post_at desc nulls last);
create index if not exists channels_category_idx  on public.channels (category_slug, last_post_at desc nulls last);
create index if not exists channels_city_idx      on public.channels (city) where city is not null;
create index if not exists channels_submitter_idx on public.channels (submitted_by, created_at desc);
-- What the daily cron sweeps.
create index if not exists channels_due_check_idx
  on public.channels (metrics_checked_at nulls first)
  where tg_username is not null and status = 'published';
-- What the reconfirm mail sweeps.
create index if not exists channels_confirm_idx
  on public.channels (confirm_by) where confirm_by is not null;

comment on column public.channels.metrics_source is
  'measured = we fetched these numbers ourselves and metrics_checked_at says
   when. declared = the submitter typed them and nothing verified anything.
   This — not platform — is what every read site must branch on before it
   prints a number as fact.';
comment on column public.channels.confirm_by is
  'Declared rows only. Past this date the row leaves the public index until the
   submitter confirms it still exists. Read-time, like every other expiry here:
   no cron writes a status.';

alter table public.channels enable row level security;

drop policy if exists "Live channels are public" on public.channels;
drop policy if exists "Submitters read their own channels" on public.channels;
drop policy if exists "Admins read every channel" on public.channels;

-- Public read repeats the read-time expiry rule in SQL. isChannelPublic() in
-- @goplaza/core is the same rule for the app; both exist because the policy
-- protects the data and the function decides what a page renders, and neither
-- can stand in for the other.
create policy "Live channels are public"
on public.channels for select
to anon, authenticated
using (
  status = 'published'
  and (confirm_by is null or confirm_by > now())
);

-- The submitter sees their own regardless of status — that is the whole point
-- of the management screen: pending, rejected, suspended and lapsed included.
create policy "Submitters read their own channels"
on public.channels for select
to authenticated
using (submitted_by = auth.uid());

create policy "Admins read every channel"
on public.channels for select
to authenticated
using (public.is_admin(auth.uid()));

-- There is deliberately NO insert/update/delete policy for regular users.
-- Every write goes through a server action with the service role, after it has
-- counted the 24h rate limit, derived metrics_source from the URL rather than
-- trusting the client, and decided the initial status. RLS can express "who
-- owns this row"; it cannot express "is this the fifth submission today" or
-- "does this URL resolve to a public username".

create or replace function public.channels_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists channels_touch_updated_at on public.channels;
create trigger channels_touch_updated_at
  before update on public.channels
  for each row execute function public.channels_touch_updated_at();

-- ------------------------------------------------------- 3. growth snapshots
-- Two columns and one row per channel per day, written by the metrics cron.
-- After a month this answers «این کانال ماه گذشته ۱۲٪ رشد کرد», which nothing
-- else in this market has.
--
-- It is the only irreversible part of the build. Every day the cron does not
-- write is a day of history that cannot be backfilled from anywhere, which is
-- why it ships in the same commit as the cron and not in a later one.
create table if not exists public.channel_member_snapshots (
  channel_id   uuid not null references public.channels (id) on delete cascade,
  day          date not null,
  member_count integer not null check (member_count >= 0),
  primary key (channel_id, day)
);

create index if not exists channel_member_snapshots_idx
  on public.channel_member_snapshots (channel_id, day desc);

alter table public.channel_member_snapshots enable row level security;

drop policy if exists "Snapshots follow their channel" on public.channel_member_snapshots;
create policy "Snapshots follow their channel"
on public.channel_member_snapshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.channels c
    where c.id = channel_id
      and c.status = 'published'
      and (c.confirm_by is null or c.confirm_by > now())
  )
);

-- ------------------------------------------------------------ 4. rate limit
-- Counted here rather than in lib/utils/rate-limit.ts, which lives in
-- per-instance memory: it resets on every deploy and does not hold across
-- regions. That was the lesson from the review caps in 5c80228.
create or replace function public.channels_recent_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.channels
  where submitted_by = p_user_id
    and created_at > now() - interval '24 hours';
$$;

grant execute on function public.channels_recent_count(uuid) to authenticated;

-- ------------------------------------------------------------- 5. analytics
-- Extend the existing registry rather than building a second one. event_types
-- and analytics_daily are already subject-generic; link_events is not, and is
-- not bent to fit — its page_id is NOT NULL and its dimensions exist to
-- justify the $13 tier. What is worth sharing is the ROLLUP: one definition of
-- a day and one of a unique visitor. See docs/06-gotchas.md, "A daily rollup
-- is not a total".
alter table public.event_types drop constraint if exists event_types_subject_kind_check;
alter table public.event_types add constraint event_types_subject_kind_check
  check (subject_kind in ('business', 'link_page', 'channel'));

alter table public.analytics_daily drop constraint if exists analytics_daily_subject_kind_check;
alter table public.analytics_daily add constraint analytics_daily_subject_kind_check
  check (subject_kind in ('business', 'link_page', 'channel'));

-- min_feature null on both: everything in this section is free, and a metric
-- behind a plan gate here would contradict the pricing page.
insert into public.event_types (key, subject_kind, label_fa, label_en, min_feature) values
  ('channel_view',       'channel', 'بازدید صفحه',      'Channel page view', null),
  ('channel_join_click', 'channel', 'کلیک روی عضویت',   'Join click',        null)
on conflict (key) do nothing;

create table if not exists public.channel_events (
  id            bigserial primary key,
  channel_id    uuid not null references public.channels (id) on delete cascade,
  event_type    text not null references public.event_types (key),
  referrer_host text,
  device        text check (device is null or device in ('mobile','desktop','tablet','bot')),
  source        text not null default 'web' check (source in ('web','mobile')),
  -- Byte-for-byte the same convention as business_events.visitor_hash and
  -- link_events.visitor_hash. Three hashing schemes would be three different
  -- definitions of "one person".
  visitor_hash  text,
  -- Crawler traffic is recorded and marked, never silently discarded: a count
  -- we cannot audit is a count we cannot defend.
  bot           boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists channel_events_channel_idx on public.channel_events (channel_id, created_at desc);
create index if not exists channel_events_rollup_idx  on public.channel_events (created_at) where not bot;

alter table public.channel_events enable row level security;
-- No policy: raw events are read by the rollup with the service role only.
-- What the public and the admin see comes from analytics_daily.

/**
 * Recompute one day of channel analytics, idempotently.
 *
 * Re-running it for a day already rolled up produces the same rows, which is
 * what lets a failed cron run simply be retried. Same shape and same
 * conflict target as roll_up_link_day.
 */
create or replace function public.roll_up_channel_day(p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.analytics_daily
    (subject_kind, subject_id, day, event_type, dimension, value, n, uniques, updated_at)
  select
    'channel',
    e.channel_id,
    p_day,
    e.event_type,
    '',
    '',
    count(*)::integer,
    count(distinct e.visitor_hash)::integer,
    now()
  from public.channel_events e
  where not e.bot
    and e.created_at >= p_day::timestamptz
    and e.created_at <  (p_day + 1)::timestamptz
  group by e.channel_id, e.event_type
  on conflict (subject_kind, subject_id, day, event_type, dimension, value)
  do update set n = excluded.n, uniques = excluded.uniques, updated_at = now();

  get diagnostics n = row_count;
  return n;
end;
$$;

/** Lifetime view count for one channel, read from the permanent rollup. */
create or replace function public.channel_view_count(p_channel_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(n), 0)::integer
  from public.analytics_daily
  where subject_kind = 'channel'
    and subject_id = p_channel_id
    and event_type = 'channel_view'
    and dimension = '';
$$;

grant execute on function public.channel_view_count(uuid) to anon, authenticated;

-- --------------------------------------------------------------- 6. reports
-- Extends business_reports for the third time, exactly as
-- 20260830400000_link_page_reports.sql did for bio pages. A second table would
-- mean a second admin queue, and the second queue is always the one nobody
-- opens.
--
-- This matters more here than anywhere else on the site: most rows in this
-- section are claims nobody can verify, so a report is the only quality
-- control that exists. The button has to file one. A report button that only
-- raised a toast has already shipped in this repo once.
alter table public.business_reports
  add column if not exists channel_id uuid references public.channels (id) on delete cascade;

alter table public.business_reports
  drop constraint if exists business_reports_has_subject,
  add constraint business_reports_has_subject
    check (business_id is not null or link_page_id is not null or channel_id is not null);

create index if not exists business_reports_channel_idx
  on public.business_reports (channel_id) where channel_id is not null;

comment on column public.business_reports.channel_id is
  'Set when the report is about a channel entry rather than a listing or a bio
   page. Exactly one of business_id / link_page_id / channel_id is populated —
   see business_reports_has_subject.';

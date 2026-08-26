-- ============================================================================
-- Migration: standing — «اعتبار مشارکت», the settled contribution ledger
-- Date: 2026-08-26
-- Design: docs/16-standing-and-loyalty.md · Plan: docs/17-standing-phase-1-plan.md
--
-- Three tables. One is the truth, one is a cache, one is the tuning surface.
-- Two decisions in this file are load-bearing; a future reader will otherwise
-- re-litigate both.
--
-- 1. POINTS ARE FROZEN AT SETTLEMENT. standing_events.points is copied from
--    standing_rules at the moment an event settles, together with the rule
--    version that produced it, and is never rewritten afterwards. That is the
--    whole reason the admin page may retune the economy freely: a change to
--    standing_rules affects only future settlements and can never rewrite
--    what someone already earned. If any later code updates points on a
--    settled row, that guarantee — and the safety of every green knob — dies.
--
-- 2. THERE IS NO level COLUMN, HERE OR ANYWHERE. The level is a pure function
--    of the aggregates below plus tunable thresholds, computed at read time
--    by levelFor() in @goplaza/core. Storing it (or computing it in SQL)
--    would put one definition of the ladder in the database and another in
--    TypeScript, and mobile would read the wrong one — the exact split
--    plans.ts v3 was written to close. SQL counts, TypeScript judges. This is
--    also why maintenance decay needs no cron: levelFor() reads
--    last_confirmed_at, so a level lapses on its own the moment the window
--    passes.
--
-- Related honesty rule (docs/16, "the wall"): nothing derived from these
-- tables may appear in what a visitor reads as the credibility of a business.
--
-- kind is plain text validated against standing_rules by the write path, NOT
-- a check constraint — adding a contribution kind must be a rules row plus a
-- call site, never a migration.
--
-- Env / Identity: no secrets. All writes ride the service role; RLS below
--      grants reads only (admin everywhere, self on the ledger).
-- ============================================================================

-- ------------------------------------------------------------- 1. the ledger
create table if not exists public.standing_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  kind          text not null,
  subject_type  text not null,
  subject_id    uuid,

  state         text not null default 'pending'
                check (state in ('pending','confirmed','reversed','void')),

  -- Frozen at settlement (see header). 0 while pending.
  points        int  not null default 0,
  rule_version  int,

  settled_at    timestamptz,
  settled_by    uuid references auth.users (id) on delete set null, -- null = system/cron
  reason        text,          -- required by the API for manual settles and all reversals
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),

  -- Idempotency lives in the database, not in callers remembering to check:
  -- one contribution produces at most one event however many times the
  -- emitting code path runs.
  constraint standing_events_once unique (kind, subject_type, subject_id, user_id)
);

comment on table public.standing_events is
  'Append-only contribution ledger («اعتبار مشارکت»). Rows are never deleted
   and points never change after settlement. pending → confirmed when
   something independent agrees (admin approval, moderation, the metrics
   cron); → reversed when a report against the subject is upheld. void is for
   rows that should never have existed (test data), not a punishment state.';

create index if not exists standing_events_user_idx
  on public.standing_events (user_id, state);
create index if not exists standing_events_state_idx
  on public.standing_events (state, created_at desc);
create index if not exists standing_events_subject_idx
  on public.standing_events (subject_type, subject_id);

alter table public.standing_events enable row level security;

-- No insert/update/delete policies: service role only, like suggestions.
drop policy if exists "standing_events admin read" on public.standing_events;
create policy "standing_events admin read"
on public.standing_events for select
using (public.is_admin(auth.uid()));

-- Self read is deliberate: a user must be able to see their own ledger,
-- including the reversals — that page is the honest answer to «چرا امتیازم
-- کم شد؟». (No public UI reads this in phase 1, but the policy is the
-- contract.)
drop policy if exists "standing_events self read" on public.standing_events;
create policy "standing_events self read"
on public.standing_events for select
using (auth.uid() = user_id);

-- ----------------------------------------------------- 2. the tuning surface
create table if not exists public.standing_rules (
  kind          text primary key,
  label_fa      text not null,
  subject_type  text not null,
  points        int  not null default 0,
  daily_cap     int  not null default 10,  -- settlements per user per day
  enabled       boolean not null default true,
  version       int  not null default 1,   -- bumped by the app on every points change
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null
);

comment on table public.standing_rules is
  'One row per contribution kind — the surface /admin/standing edits. Safe to
   retune at any time because settlement freezes points into the event row.
   Adding a kind here without a call site that emits it creates a rule that
   fires never; new kinds ship with code (docs/16, red list).';

alter table public.standing_rules enable row level security;
-- Settings gate behaviour; a client-writable rules table is a self-service
-- discount. Same reasoning as site_settings.
drop policy if exists "standing_rules admin read" on public.standing_rules;
create policy "standing_rules admin read"
on public.standing_rules for select
using (public.is_admin(auth.uid()));

-- ------------------------------------------------------------- 3. the cache
create table if not exists public.user_standing (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  xp                int  not null default 0,   -- lifetime, monotonic
  confirmed_count   int  not null default 0,
  reversed_count    int  not null default 0,
  distinct_kinds    int  not null default 0,   -- the variety gate reads this
  accuracy          numeric(4,3),              -- confirmed/(confirmed+reversed), trailing 365d
  last_confirmed_at timestamptz,

  -- NOTE: deliberately no `level` column — see the file header. peak_level IS
  -- stored because a high-water mark is not derivable from a snapshot; it is
  -- raised (never lowered) by the app after recompute.
  peak_level        int  not null default 0,
  peak_level_at     timestamptz,

  -- Admin overrides, both from the amber list: a typed reason and a
  -- user_activity_logs row are required by the API, not by this table.
  level_grant       int,        -- non-null pins the level (how نگهبان exists)
  frozen            boolean not null default false,
  admin_note        text,

  recomputed_at     timestamptz
);

comment on table public.user_standing is
  'Aggregate cache over standing_events. Always fully derivable from the
   ledger + rules; when they disagree, the ledger wins and this row is wrong.
   recompute_standing() is the only writer of the aggregate columns.';

alter table public.user_standing enable row level security;

drop policy if exists "user_standing admin read" on public.user_standing;
create policy "user_standing admin read"
on public.user_standing for select
using (public.is_admin(auth.uid()));

drop policy if exists "user_standing self read" on public.user_standing;
create policy "user_standing self read"
on public.user_standing for select
using (auth.uid() = user_id);

-- ------------------------------------------------------------ 4. the counter
-- Writes ONLY the aggregate columns. No level, no thresholds, no peak_level,
-- no touching level_grant/frozen/admin_note — SQL counts, TypeScript judges.
create or replace function public.recompute_standing(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_standing as us
    (user_id, xp, confirmed_count, reversed_count, distinct_kinds,
     accuracy, last_confirmed_at, recomputed_at)
  select
    p_user,
    coalesce(sum(points) filter (where state = 'confirmed'), 0),
    count(*) filter (where state = 'confirmed'),
    count(*) filter (where state = 'reversed'),
    count(distinct kind) filter (where state = 'confirmed'),
    -- Accuracy over the trailing 365 days, null until something settled —
    -- null means "no evidence yet", which is not the same claim as 0.
    case
      when count(*) filter (where state in ('confirmed','reversed')
                              and settled_at > now() - interval '365 days') = 0
      then null
      else round(
        (count(*) filter (where state = 'confirmed'
                            and settled_at > now() - interval '365 days'))::numeric
        / (count(*) filter (where state in ('confirmed','reversed')
                              and settled_at > now() - interval '365 days')),
        3)
    end,
    max(settled_at) filter (where state = 'confirmed'),
    now()
  from public.standing_events
  where user_id = p_user
  on conflict (user_id) do update set
    xp                = excluded.xp,
    confirmed_count   = excluded.confirmed_count,
    reversed_count    = excluded.reversed_count,
    distinct_kinds    = excluded.distinct_kinds,
    accuracy          = excluded.accuracy,
    last_confirmed_at = excluded.last_confirmed_at,
    recomputed_at     = excluded.recomputed_at;
$$;

-- ------------------------------------------------------------- 5. seed rules
-- Every kind below has an existing table and an emitter planned in docs/17.
-- The point values are GUESSES that have never met real data; they are seeded
-- once and thereafter owned by /admin/standing, which is why this is
-- do-nothing on conflict — re-running the migration must not undo tuning.
insert into public.standing_rules (kind, label_fa, subject_type, points, daily_cap) values
  ('channel_submit',    'ثبت کانال یا گروه',        'channel',  25, 5),
  ('business_submit',   'ثبت کسب‌وکار',              'business', 30, 5),
  ('business_edit',     'اصلاح اطلاعات کسب‌وکار',    'business', 10, 10),
  ('review_publish',    'نظر منتشرشده',             'review',   15, 3),
  ('report_upheld',     'گزارش واردشناخته‌شده',      'report',   20, 5),
  ('channel_reconfirm', 'تأیید دوباره‌ی کانال',      'channel',   5, 5)
on conflict (kind) do nothing;

-- ---------------------------------------------------------- 6. seed settings
-- OFF by default, both switches. The program is flipped on from the admin
-- page after the page exists — never by a migration. recordEvent() ignores
-- the master switch on purpose (events accrue as pending while off), so
-- enabling later loses nothing.
insert into public.site_settings (key, value)
values ('standing', '{"enabled": false, "public_display": false}'::jsonb)
on conflict (key) do nothing;

-- -------------------------------------------------------------- 7. audit tag
-- The amber admin actions (manual settle/reverse, نگهبان grant, freeze,
-- forced recompute) log into user_activity_logs; the enum needs a value for
-- them. add value cannot run inside a transaction block on older Postgres,
-- but the SQL Editor runs statements individually, which is how this file is
-- applied.
alter type public.activity_action add value if not exists 'STANDING_ADMIN';

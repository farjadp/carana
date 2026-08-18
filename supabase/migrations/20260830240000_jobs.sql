-- ============================================================================
-- Migration: job_posts — the hiring board
-- Date: 2026-08-18
-- Design: docs/09-jobs-board.md (four forks decided by Farjad on 18 Aug)
--
-- Shaped exactly like business_announcements: there is NO insert/update/delete
-- policy for regular users at all. Every write goes through a server action
-- (lib/actions/jobs.ts) with the service role, after it re-proves ownership,
-- counts the 24h rate limit and decides the initial status. RLS can express
-- "who owns this row"; it cannot express "is this business verified today",
-- "has it posted five ads since yesterday" or "is the parent listing public",
-- and all three of those decide whether a post may exist.
--
-- EXPIRY IS NOT A STATUS. A post is live when
--   status = 'published' and closed_at is null and expires_at > now()
-- computed at read time — the same rule verified_until, plan_until and
-- busy_status_until already follow in this schema. No cron job is needed to
-- keep the board honest, and nothing is ever trusted past its own timestamp.
--
-- SALARY IS OPTIONAL, for now (Farjad, 18 Aug). Ontario's 2026
-- pay-transparency rules for publicly advertised postings have not been
-- verified against a primary source yet. If a range turns out to be
-- mandatory, salary_min becomes NOT NULL here and required in the form —
-- that migration will have to backfill or close whatever was posted without
-- one, so check before the board is promoted anywhere.
-- ============================================================================

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,

  -- English, unique, per the standing URL rule. Built with latinSlug() from
  -- @charana/core so it transliterates Persian rather than dropping it.
  slug text not null unique,

  title text not null,
  description text not null,

  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','contract','casual','internship')),
  workplace_type text not null default 'on_site'
    check (workplace_type in ('on_site','hybrid','remote')),

  -- Defaults from the business but overridable: a Toronto office may hire in
  -- Vancouver, and filing that job under Toronto would be a quiet lie.
  city text,
  province text,

  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  salary_period text check (salary_period is null or salary_period in ('hour','month','year')),
  -- false = «حقوق توافقی». Never a silently empty field: the form makes the
  -- owner choose between a number and saying it is negotiable.
  salary_is_public boolean not null default false,

  -- The differentiator. The reason this board exists rather than Indeed.
  requires_persian boolean not null default false,
  requires_english boolean not null default false,

  apply_method text not null check (apply_method in ('email','phone','url')),
  apply_value text not null,

  status text not null default 'pending_moderation'
    check (status in ('pending_moderation','published','rejected','closed')),
  moderation_reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,

  expires_at timestamptz not null,
  closed_at timestamptz,
  view_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A range that reads backwards is worse than no range.
  constraint job_posts_salary_order check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  ),
  -- A public salary has to actually say something.
  constraint job_posts_salary_public_needs_a_number check (
    salary_is_public = false or (salary_min is not null and salary_period is not null)
  )
);

create index if not exists job_posts_business_idx  on public.job_posts (business_id, created_at desc);
create index if not exists job_posts_live_idx      on public.job_posts (status, expires_at desc) where closed_at is null;
create index if not exists job_posts_city_idx      on public.job_posts (city);
create index if not exists job_posts_created_idx   on public.job_posts (created_at desc);

alter table public.job_posts enable row level security;

drop policy if exists "Live jobs are public for public businesses" on public.job_posts;
drop policy if exists "Owners read their own jobs" on public.job_posts;
drop policy if exists "Admins read every job" on public.job_posts;

-- Public read is scoped twice: the post must be live on its own terms, and the
-- parent listing must be one the public can actually open. A job on a DRAFT
-- listing has nowhere to link to.
create policy "Live jobs are public for public businesses"
on public.job_posts for select
to anon, authenticated
using (
  status = 'published'
  and closed_at is null
  and expires_at > now()
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status in ('APPROVED', 'PUBLISHED')
  )
);

-- The owner sees their own regardless of status — that is the whole point of
-- the management screen: pending, rejected, expired and closed included.
create policy "Owners read their own jobs"
on public.job_posts for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id
      and (b.owner_user_id = auth.uid() or b.created_by = auth.uid())
  )
);

create policy "Admins read every job"
on public.job_posts for select
to authenticated
using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------- updated_at
create or replace function public.job_posts_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_posts_touch_updated_at on public.job_posts;
create trigger job_posts_touch_updated_at
  before update on public.job_posts
  for each row execute function public.job_posts_touch_updated_at();

-- ------------------------------------------------------------------ counters
/**
 * How many posts this business created in the last 24 hours.
 *
 * The abuse ceiling is counted here rather than in lib/utils/rate-limit.ts,
 * which lives in per-instance memory: it resets on every deploy and does not
 * hold across regions. That was the lesson from the review caps in 5c80228.
 *
 * Deliberately a rate limit and NOT a plan gate — jobs are free and unlimited
 * (Farjad, 18 Aug), and a guard that lives in plans.ts quietly becomes a thing
 * to sell later.
 */
create or replace function public.job_posts_recent_count(p_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.job_posts
  where business_id = p_business_id
    and created_at > now() - interval '24 hours';
$$;

grant execute on function public.job_posts_recent_count(uuid) to authenticated;

/** Live-post count for a business. Used by the profile section, which must never show a number it cannot back. */
create or replace function public.live_job_count(p_business_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.job_posts
  where business_id = p_business_id
    and status = 'published'
    and closed_at is null
    and expires_at > now();
$$;

grant execute on function public.live_job_count(uuid) to anon, authenticated;

-- ------------------------------------------------------- the apply-click event
-- Applications happen off-site, but the reveal-on-click is recorded, because
-- «۱۲ نفر روی درخواست کلیک کردند» is the number 08-competitors.md §9.5 calls
-- the key to revenue. Extends the existing check constraint rather than
-- replacing the table's contract.
alter table public.business_events drop constraint if exists business_events_event_type_check;
alter table public.business_events add constraint business_events_event_type_check
  check (event_type in ('view','call','whatsapp','directions','website','booking','share','email','instagram','telegram','save','job_apply'));

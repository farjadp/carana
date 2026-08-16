-- ============================================================================
-- Migration: abuse reports, conversion events, city provenance
-- Date: 2026-08-16
--
-- Three things the product asserted but did not have:
--   1. business_reports — the profile's "report" button showed a toast and
--      wrote nothing. Now it writes here and lands in an admin queue.
--   2. business_events — every tap on call / WhatsApp / directions / website /
--      booking. This is what the owner analytics dashboard is blocked on, and
--      it is the only honest way to tell an owner what the listing did for
--      them. No PII: a daily-rotating hash, never a raw IP.
--   3. businesses.city_source — where a city value came from. 409 rows say
--      "نامشخص"; the cleanup queue infers from phone area code, and a guess
--      must be labelled as a guess.
-- ============================================================================

-- ---------------------------------------------------------------- 1. reports
create table if not exists public.business_reports (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  reporter_id  uuid references auth.users (id) on delete set null,
  reason       text not null check (reason in ('closed','wrong_info','duplicate','not_iranian','spam','offensive','impersonation','other')),
  details      text,
  contact      text,
  status       text not null default 'new' check (status in ('new','reviewing','resolved','rejected')),
  admin_note   text,
  resolved_by  uuid references auth.users (id) on delete set null,
  resolved_at  timestamptz,
  source       text not null default 'web' check (source in ('web','mobile')),
  created_at   timestamptz not null default now()
);

create index if not exists business_reports_status_idx   on public.business_reports (status, created_at desc);
create index if not exists business_reports_business_idx on public.business_reports (business_id);

alter table public.business_reports enable row level security;

drop policy if exists "reports admin read"   on public.business_reports;
drop policy if exists "reports admin write"  on public.business_reports;
drop policy if exists "reports own read"     on public.business_reports;

-- Writes go through /api/reports with the service role (anonymous reporting is
-- the point), so there is no insert policy here.
create policy "reports admin read"  on public.business_reports for select to authenticated using (public.is_admin(auth.uid()));
create policy "reports admin write" on public.business_reports for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "reports own read"    on public.business_reports for select to authenticated using (reporter_id = auth.uid());

-- ----------------------------------------------------------------- 2. events
create table if not exists public.business_events (
  id           bigserial primary key,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  event_type   text not null check (event_type in ('view','call','whatsapp','directions','website','booking','share','email','instagram','telegram','save')),
  source       text not null default 'web' check (source in ('web','mobile')),
  -- sha256(ip + user-agent + date + salt), truncated. Rotates daily, so it
  -- de-duplicates within a day and identifies nobody across days.
  visitor_hash text,
  referrer     text,
  created_at   timestamptz not null default now()
);

create index if not exists business_events_biz_time_idx on public.business_events (business_id, created_at desc);
create index if not exists business_events_type_idx     on public.business_events (event_type, created_at desc);

alter table public.business_events enable row level security;

drop policy if exists "events admin read" on public.business_events;
drop policy if exists "events owner read" on public.business_events;

create policy "events admin read" on public.business_events for select to authenticated using (public.is_admin(auth.uid()));
create policy "events owner read" on public.business_events for select to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = auth.uid()));

/**
 * Daily rollup for the owner dashboard. SECURITY INVOKER, so the policies
 * above still decide which businesses a caller may aggregate.
 */
create or replace function public.business_event_summary(p_business_id uuid, p_days integer default 30)
returns table (day date, event_type text, n bigint)
language sql
stable
as $$
  select date_trunc('day', created_at)::date as day, event_type, count(*) as n
  from public.business_events
  where business_id = p_business_id
    and created_at >= now() - (greatest(1, least(p_days, 365)) || ' days')::interval
  group by 1, 2
  order by 1;
$$;

grant execute on function public.business_event_summary(uuid, integer) to authenticated;

-- ------------------------------------------------------------ 3. city source
alter table public.businesses
  add column if not exists city_source text
    check (city_source is null or city_source in ('owner','import','area_code','admin'));

comment on column public.businesses.city_source is
  'Where the city value came from. area_code means it was inferred from the phone number and is a guess, not a statement by the owner.';

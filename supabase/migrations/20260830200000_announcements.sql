-- ============================================================================
-- Migration: business announcements (quota by plan)
-- Date: 2026-08-16
--
-- Quota is enforced in the server action (lib/actions/announcements.ts),
-- not here — same reason as gallery and busy_status: RLS can express "who
-- owns this row" but not "does this plan still have room this month", and
-- that check has to recompute from plan/plan_until anyway (a lapsed
-- subscription must not keep posting Premium-rate announcements). So there
-- is no insert/update/delete policy for regular users at all; every write
-- goes through the service role after the action re-proves ownership and
-- counts the rolling 30-day window against ANNOUNCEMENT_LIMITS.
--
-- Public read is scoped to businesses that are actually public — an
-- announcement on a DRAFT listing has no audience to read it anyway, but
-- the policy makes that structural, not incidental.
-- ============================================================================

create table if not exists public.business_announcements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  body text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists business_announcements_business_idx
  on public.business_announcements (business_id, created_at desc);

alter table public.business_announcements enable row level security;

drop policy if exists "Announcements are public for public businesses" on public.business_announcements;
create policy "Announcements are public for public businesses"
on public.business_announcements for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status in ('APPROVED', 'PUBLISHED')
  )
);

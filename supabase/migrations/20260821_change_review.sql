-- ============================================================================
-- Migration: AI-assisted change review for published listings
-- Date: 2026-08-21
-- Why: An owner editing an already-published listing could previously change
--      the content without any re-review (approve with clean copy, swap it
--      later). Edits now run through a classifier: routine changes stay live,
--      anything identity-, trust- or content-sensitive goes back to a human.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Audit trail of every review decision.
-- ----------------------------------------------------------------------------
create table if not exists public.business_change_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  changed_fields  text[] not null default '{}',
  critical_fields text[] not null default '{}',
  decision text not null check (decision in ('auto_approve', 'needs_admin')),
  reason text,
  ai_verdict jsonb,

  -- status the listing was in before the edit, so an admin can see what the
  -- change actually cost (a live listing pulled down vs a draft edited).
  previous_status public.business_status,
  resulting_status public.business_status,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bcr_business on public.business_change_reviews(business_id);
create index if not exists idx_bcr_decision on public.business_change_reviews(decision, created_at desc);

alter table public.business_change_reviews enable row level security;

drop policy if exists "change_reviews_admin_read" on public.business_change_reviews;
create policy "change_reviews_admin_read"
on public.business_change_reviews
for select
using (public.is_admin(auth.uid()));

drop policy if exists "change_reviews_owner_read" on public.business_change_reviews;
create policy "change_reviews_owner_read"
on public.business_change_reviews
for select
using (user_id = auth.uid());

-- Rows are written by the server with the service role only. No insert or
-- update policy is defined on purpose, so a client cannot forge a decision.

-- ----------------------------------------------------------------------------
-- 2. Close the direct-client bypass.
--
--    20260820 let an owner update a PUBLISHED row as long as they left the
--    status alone. That was needed so the edit form kept working, but it also
--    means a client talking to PostgREST directly — the mobile app, or curl —
--    can rewrite live content without ever reaching the classifier.
--
--    Owners may now only write rows that are in DRAFT or SUBMITTED. Edits to a
--    published listing go through the server action, which verifies ownership,
--    runs the review, and applies the write with the service role.
-- ----------------------------------------------------------------------------
drop policy if exists "businesses_owner_update" on public.businesses;
create policy "businesses_owner_update"
on public.businesses
for update
using (
  auth.uid() = created_by
  -- the row must already be in an editable state ...
  and public.business_current_status(id) in ('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'REJECTED')
)
with check (
  auth.uid() = created_by
  -- ... and must stay in one the owner is allowed to leave it in.
  and status in ('DRAFT', 'SUBMITTED')
);

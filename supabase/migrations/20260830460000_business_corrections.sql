-- ============================================================================
-- Migration: business_corrections — «اصلاح اطلاعات» by people who do not own
--            the listing. Standing phase 2 (docs/16-standing-and-loyalty.md).
-- Date: 2026-08-26
--
-- WHY THIS TABLE HAD TO EXIST BEFORE PHASE 2 COULD MEAN ANYTHING. The spec's
-- phase 2 is "a معتمد's low-risk edits publish without the queue". Auditing the
-- code first found two things that made that unbuildable as written:
--
--   1. There was NO contributor edit path at all. A stranger could report a
--      listing as wrong (business_reports.reason = 'wrong_info', free text) but
--      could not propose a value. An admin read the prose and retyped it.
--   2. For the OWNER, hours already publish instantly —
--      lib/moderation/change-review.ts treats them as operational — so
--      "auto-publish hours" granted a معتمد nothing that did not already exist.
--
-- So the unlock is real only for NON-OWNERS, and this is the table it acts on.
-- A correction is a proposed value for one field of one listing. Everything
-- queues, except a معتمد's proposal on a LOW_RISK field, which applies at once
-- and is audited afterwards (applied_directly = true marks exactly those rows,
-- so "what did the ladder let through?" is one query, not an investigation).
--
-- The field allow-list lives in @goplaza/core (CORRECTABLE_FIELDS), NOT in a
-- check constraint here: it is a safety boundary that web and mobile must read
-- from one place, and widening it must be a reviewed diff rather than a
-- migration nobody re-reads.
--
-- Env / Identity: writes go through /api/corrections and the admin action,
--      both service role after their own auth checks.
-- ============================================================================

create table if not exists public.business_corrections (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,

  field         text not null,
  -- jsonb, because working_hours is an object and phone is a string. The
  -- previous value is kept so an admin can see what is being replaced without
  -- a second query, and so a rollback after a bad auto-publish is possible.
  proposed      jsonb not null,
  previous      jsonb,

  status        text not null default 'pending'
                check (status in ('pending','applied','rejected')),
  -- True only when a معتمد's low-risk proposal went live without a human.
  -- This is the audit trail phase 2 owes: the ladder granting publication is
  -- exactly the thing that must stay reviewable after the fact.
  applied_directly boolean not null default false,

  note          text,
  decided_by    uuid references auth.users (id) on delete set null,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- One OPEN proposal per person per field per listing — a second submission is
-- an edit of the first, not a second vote. Partial on purpose: a plain unique
-- over (business, user, field, status) would also forbid a second REJECTED
-- row, so a person whose correction was turned down twice could not propose a
-- third time. Only the pending state is exclusive.
create unique index if not exists business_corrections_one_open
  on public.business_corrections (business_id, user_id, field)
  where status = 'pending';

comment on table public.business_corrections is
  'Proposed field corrections from people who do not own the listing. Standing
   level 2 (معتمد) publishes LOW_RISK_FIELDS immediately with
   applied_directly = true; everything else waits for an admin.';

create index if not exists business_corrections_status_idx
  on public.business_corrections (status, created_at desc);
create index if not exists business_corrections_business_idx
  on public.business_corrections (business_id);
create index if not exists business_corrections_audit_idx
  on public.business_corrections (applied_directly, decided_at desc)
  where applied_directly;

alter table public.business_corrections enable row level security;

drop policy if exists "corrections admin read" on public.business_corrections;
create policy "corrections admin read"
on public.business_corrections for select
using (public.is_admin(auth.uid()));

-- The proposer sees their own, whatever became of it — including a rejection,
-- which is the honest answer to "what happened to my correction?".
drop policy if exists "corrections self read" on public.business_corrections;
create policy "corrections self read"
on public.business_corrections for select
using (auth.uid() = user_id);

-- The listing's owner sees what strangers proposed about their listing.
drop policy if exists "corrections owner read" on public.business_corrections;
create policy "corrections owner read"
on public.business_corrections for select
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_corrections.business_id
      and (b.owner_user_id = auth.uid() or b.created_by = auth.uid())
  )
);

-- ------------------------------------------------- fix the seeded rule's label
-- 20260830420000 seeded business_edit with subject_type 'business', written
-- before this table existed. The emitter keys events on the CORRECTION, not
-- the listing — one person may correct the same listing more than once, and
-- each is its own contribution — so the rule row has to agree. Updated here
-- rather than by editing that file: it has been applied, and applied
-- migrations are immutable (and its insert is `on conflict do nothing`, so
-- editing it would have changed nothing anyway).
update public.standing_rules
   set subject_type = 'correction'
 where kind = 'business_edit'
   and subject_type <> 'correction';

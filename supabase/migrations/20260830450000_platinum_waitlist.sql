-- ============================================================================
-- Migration: platinum_waitlist — «وفاداری مالک» phase 4, seat priority
-- Date: 2026-08-26
-- Design: docs/16-standing-and-loyalty.md ("Platinum seat priority")
--
-- Until now, an owner who tried to buy Platinum while all PLATINUM_SEAT_CAP
-- (21) seats were taken received a 409 and nothing was recorded anywhere. The
-- interest evaporated, and when a seat freed there was no way to know who had
-- wanted it — so "longest continuous tenure is offered it first" could not be
-- honoured even in principle.
--
-- ONE ROW PER BUSINESS, and position is NOT stored. The queue is ordered at
-- read time by continuous tenure (computed from invoices) with joined_at as
-- the tiebreak, for the same reason tenure itself is never stored: a stored
-- position would be a number that silently stops being true the moment
-- someone's subscription lapses. Nothing in this table is a promise — see the
-- honesty note on `notified_at`.
--
-- Env / Identity: writes go through the checkout route and an admin action,
--      both service role. Owners may read their own row.
-- ============================================================================

create table if not exists public.platinum_waitlist (
  business_id   uuid primary key references public.businesses (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  joined_at     timestamptz not null default now(),
  -- Set only when a human has actually told this owner a seat is available.
  -- It must never be written by a "we computed that they are next" job: a
  -- notified_at with no message sent is a record of a promise nobody made.
  notified_at   timestamptz,
  admin_note    text
);

comment on table public.platinum_waitlist is
  'Interest in a Platinum seat while all PLATINUM_SEAT_CAP seats are taken.
   Queue position is computed at read time from continuous paid tenure, never
   stored. Being on this list is not an offer and not a reservation.';

create index if not exists platinum_waitlist_joined_idx
  on public.platinum_waitlist (joined_at);

alter table public.platinum_waitlist enable row level security;

drop policy if exists "platinum_waitlist admin read" on public.platinum_waitlist;
create policy "platinum_waitlist admin read"
on public.platinum_waitlist for select
using (public.is_admin(auth.uid()));

-- The owner may see that they are on the list. They may not see the list.
drop policy if exists "platinum_waitlist self read" on public.platinum_waitlist;
create policy "platinum_waitlist self read"
on public.platinum_waitlist for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.businesses b
    where b.id = platinum_waitlist.business_id
      and (b.owner_user_id = auth.uid() or b.created_by = auth.uid())
  )
);

-- ------------------------------------------------------- seed the settings
-- Explicit and OFF. getLoyaltySettings() already fails soft to disabled, but
-- an absent key and a key that says "off" read the same in code and very
-- differently to a person auditing what this system is doing.
insert into public.site_settings (key, value)
values ('loyalty', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

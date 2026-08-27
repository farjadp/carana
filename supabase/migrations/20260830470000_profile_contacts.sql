-- ============================================================================
-- Migration: profile_contacts — «راه‌های تماس بیشتر». Up to two extra emails
--            and two extra phone numbers per person, on top of the account
--            email (auth.users) and profiles.mobile_number.
-- Date: 2026-08-26
--
-- WHAT THIS TABLE IS NOT. It is not a second login identity. Supabase Auth
-- holds exactly one email per user; a row here can never receive a magic
-- link, recover a password, or authenticate anything. Nothing verifies these
-- values either — there is no `verified_at` column BECAUSE nothing would ever
-- write to it, and a column that only ever holds NULL is how a "verified"
-- badge gets invented later. Both facts are printed next to the fields in
-- app/profile/contacts-form.tsx.
--
-- THE CAP IS A TRIGGER, NOT A COMMENT. RLS lets the browser write these rows
-- directly with the user's own token, so a cap enforced only in the server
-- action is a cap enforced only for people who use the form. MAX_EXTRA_CONTACTS
-- in @goplaza/core is the same number for the message; this is the boundary.
--
-- Env / Identity: every row is owned by one auth.users id; RLS scopes select,
--      insert, update and delete to that owner. No admin policy — nobody has
--      asked to read other people's contact details from the admin panel, and
--      a policy that exists "just in case" is a permission nobody reviewed.
-- ============================================================================

create table if not exists public.profile_contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,

  kind       text not null check (kind in ('email','phone')),
  -- Stored exactly as normalizeContactValue() produced it: emails lower-cased
  -- and trimmed, phones with Persian digits folded to ASCII but formatting
  -- (spaces, dashes, a leading +) kept, because this is a display field.
  value      text not null check (length(value) between 3 and 254),
  label      text check (length(label) <= 40),

  created_at timestamptz not null default now()
);

-- The same address twice is a mistake, not a second contact. Case is already
-- folded for emails by the app; lower() here so a crafted request cannot slip
-- «Ali@x.com» past a row that already holds «ali@x.com».
create unique index if not exists profile_contacts_unique_value
  on public.profile_contacts (user_id, kind, lower(value));

create index if not exists profile_contacts_user_idx
  on public.profile_contacts (user_id, kind, created_at);

comment on table public.profile_contacts is
  'Extra contact emails and phone numbers a person recorded on their profile.
   Contact details only — never a login identity, never verified. Capped at
   two rows per kind per user by profile_contacts_cap().';

-- --------------------------------------------------------------- the cap
create or replace function public.profile_contacts_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing int;
begin
  select count(*) into existing
    from public.profile_contacts
   where user_id = new.user_id
     and kind = new.kind
     and (tg_op = 'INSERT' or id <> new.id);

  if existing >= 2 then
    -- The action matches on this text and answers in Persian; it is never
    -- shown to anyone as written. Keep it greppable rather than pretty.
    raise exception 'profile_contacts cap reached for kind %', new.kind
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profile_contacts_cap_trg on public.profile_contacts;
create trigger profile_contacts_cap_trg
  before insert or update on public.profile_contacts
  for each row execute function public.profile_contacts_cap();

-- --------------------------------------------------------------- RLS
alter table public.profile_contacts enable row level security;

drop policy if exists "profile contacts self read" on public.profile_contacts;
create policy "profile contacts self read"
on public.profile_contacts for select
using (auth.uid() = user_id);

drop policy if exists "profile contacts self insert" on public.profile_contacts;
create policy "profile contacts self insert"
on public.profile_contacts for insert
with check (auth.uid() = user_id);

drop policy if exists "profile contacts self update" on public.profile_contacts;
create policy "profile contacts self update"
on public.profile_contacts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profile contacts self delete" on public.profile_contacts;
create policy "profile contacts self delete"
on public.profile_contacts for delete
using (auth.uid() = user_id);

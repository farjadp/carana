-- ============================================================================
-- Source: supabase/migrations/20260811_auth_roles.sql
-- Version: 1.3.0 — 2026-08-11
-- Why: Create the first-pass auth, role, membership, claim, and RLS model.
-- Env / Identity: Intended for the čārana Supabase project.
-- ============================================================================

create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'user',
  'business_owner',
  'moderator',
  'admin'
);

create type public.membership_role as enum (
  'owner',
  'manager',
  'editor'
);

create type public.claim_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  city text not null,
  description text,
  phone text,
  website text,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, user_id)
);

create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.claim_status not null default 'pending',
  note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'desired_role')::public.app_role, 'user')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.business_claims enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('admin', 'moderator')
  );
$$;

create or replace function public.has_business_access(target_business_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.business_memberships
    where business_id = target_business_id
      and user_id = target_user_id
  );
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read"
on public.businesses
for select
using (is_published or public.has_business_access(id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert"
on public.businesses
for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('business_owner', 'admin', 'moderator')
  )
);

drop policy if exists "businesses_owner_update" on public.businesses;
create policy "businesses_owner_update"
on public.businesses
for update
using (public.has_business_access(id, auth.uid()) or public.is_admin(auth.uid()))
with check (public.has_business_access(id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "memberships_select_owner_or_admin" on public.business_memberships;
create policy "memberships_select_owner_or_admin"
on public.business_memberships
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()) or public.has_business_access(business_id, auth.uid()));

drop policy if exists "memberships_admin_manage" on public.business_memberships;
create policy "memberships_admin_manage"
on public.business_memberships
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "claims_insert_self" on public.business_claims;
create policy "claims_insert_self"
on public.business_claims
for insert
with check (user_id = auth.uid());

drop policy if exists "claims_select_self_or_admin" on public.business_claims;
create policy "claims_select_self_or_admin"
on public.business_claims
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "claims_admin_update" on public.business_claims;
create policy "claims_admin_update"
on public.business_claims
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

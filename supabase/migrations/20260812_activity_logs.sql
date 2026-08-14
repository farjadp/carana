-- ============================================================================
-- Migration: User Activity Logging System
-- Date: 2026-08-12
-- ============================================================================

create type public.activity_action as enum (
  'SIGNUP',
  'LOGIN',
  'LOGOUT',
  'ROLE_UPDATE',
  'PROFILE_UPDATE',
  'SECURITY_ALERT'
);

create table if not exists public.user_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action public.activity_action not null,
  ip_address text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Index for faster timeline sorting
create index user_activity_logs_user_id_created_at_idx on public.user_activity_logs (user_id, created_at desc);

-- Enable RLS
alter table public.user_activity_logs enable row level security;

-- Admins can view all logs
create policy "logs_admin_select"
on public.user_activity_logs
for select
using (public.is_admin(auth.uid()));

-- Users can view their own logs
create policy "logs_self_select"
on public.user_activity_logs
for select
using (auth.uid() = user_id);

-- System or self can insert logs
create policy "logs_insert"
on public.user_activity_logs
for insert
with check (
  public.is_admin(auth.uid()) 
  or auth.uid() = user_id
);

-- Update trigger for SIGNUP (to automatically log signups)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Insert Profile
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
      
  -- 2. Insert SIGNUP log
  insert into public.user_activity_logs (user_id, action, metadata)
  values (
    new.id,
    'SIGNUP',
    jsonb_build_object('email', new.email)
  );

  return new;
end;
$$;

-- ============================================================================
-- Migration: Security Hardening — make RLS the source of truth
-- Date: 2026-08-20
-- Why: Authorization was enforced in Next.js server actions, not in the
--      database. A mobile client talking to Supabase directly bypasses all of
--      it. This migration moves every rule that matters into the database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fix is_admin(): it reads public.profiles, which itself has RLS policies
--    that call is_admin(). Without SECURITY DEFINER this recurses / silently
--    returns false. Every admin policy in the schema depends on this function.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_memberships
    where business_id = target_business_id
      and user_id = target_user_id
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Close the signup privilege-escalation hole.
--    handle_new_user() trusted raw_user_meta_data->>'desired_role', which is
--    fully client-controlled: anyone could sign up as 'admin'. New accounts are
--    now always 'user'; role changes go through an admin only.
-- ----------------------------------------------------------------------------
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
    'user'  -- never read the role from client-supplied metadata
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      updated_at = timezone('utc', now());
      -- note: role deliberately NOT updated here

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Stop users from editing their own role.
--    "profiles_update_self_or_admin" let a user update their own row, role
--    column included. Split it: users may edit their profile fields, only
--    admins may change role.
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles_update_self_or_admin" on public.profiles;

drop policy if exists "profiles_update_own_fields" on public.profiles;
create policy "profiles_update_own_fields"
on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  -- role must stay exactly as it is
  and role = public.current_user_role()
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. Stop owners from publishing their own listing.
--    "businesses_owner_update" allowed created_by = auth.uid() to update ANY
--    column, status included. Owners may now only move between the states they
--    are allowed to reach; APPROVED / PUBLISHED are admin-only.
-- ----------------------------------------------------------------------------
create or replace function public.business_current_status(target_business_id uuid)
returns public.business_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.businesses where id = target_business_id;
$$;

drop policy if exists "businesses_owner_update" on public.businesses;

create policy "businesses_owner_update"
on public.businesses
for update
using (auth.uid() = created_by)
with check (
  auth.uid() = created_by
  and (
    -- an owner may move a row into a reviewable state ...
    status in ('DRAFT', 'SUBMITTED')
    -- ... or edit content while leaving the status untouched. The helper is
    -- STABLE, so inside an UPDATE it sees the pre-update snapshot and returns
    -- the OLD status. Without this branch, editing an already-PUBLISHED
    -- listing would be rejected outright.
    or status = public.business_current_status(id)
  )
);

drop policy if exists "businesses_admin_update" on public.businesses;
create policy "businesses_admin_update"
on public.businesses
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Owners may only create rows in DRAFT/SUBMITTED, and only as themselves.
drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert"
on public.businesses
for insert
with check (
  auth.uid() = created_by
  and status in ('DRAFT', 'SUBMITTED')
);

drop policy if exists "businesses_admin_insert" on public.businesses;
create policy "businesses_admin_insert"
on public.businesses
for insert
with check (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Stop review authors from publishing their own reviews.
--    "Users can update own reviews" let a user set status = 'published'.
-- ----------------------------------------------------------------------------
create or replace function public.review_current_status(target_review_id uuid)
returns public.public_review_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.public_reviews where id = target_review_id;
$$;

drop policy if exists "Users can update own reviews" on public.public_reviews;
create policy "Users can update own reviews"
on public.public_reviews
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    status in ('draft', 'submitted', 'pending_moderation', 'deleted_by_user')
    or status = public.review_current_status(id)
  )
);

-- Users may only submit a review into a pending state, never a published one.
drop policy if exists "Users can insert own reviews" on public.public_reviews;
create policy "Users can insert own reviews"
on public.public_reviews
for insert
with check (
  auth.uid() = user_id
  and status in ('draft', 'submitted', 'pending_moderation')
);

-- ----------------------------------------------------------------------------
-- 6. Verification codes must not be readable by the user being verified.
--    The old "FOR ALL USING (auth.uid() = user_id)" policy let a user select
--    their own OTP, which makes the whole check pointless. Codes are now
--    server-only (service role bypasses RLS); no policy = no client access.
-- ----------------------------------------------------------------------------
drop policy if exists "Users can manage their own verification codes"
  on public.verification_codes;

-- Store a hash, not the code itself.
alter table public.verification_codes
  add column if not exists code_hash text,
  add column if not exists attempts integer not null default 0,
  add column if not exists consumed_at timestamptz;

-- ----------------------------------------------------------------------------
-- 7. Scope the public 'businesses' storage bucket to the uploading user.
--    Previously any authenticated user could write anywhere in the bucket.
--    Objects must live under <auth.uid()>/... exactly like the user-media bucket.
-- ----------------------------------------------------------------------------
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;

drop policy if exists "storage_businesses_public_read"   on storage.objects;
drop policy if exists "storage_businesses_owner_insert" on storage.objects;
drop policy if exists "storage_businesses_owner_update" on storage.objects;
drop policy if exists "storage_businesses_owner_delete" on storage.objects;

create policy "storage_businesses_public_read"
on storage.objects for select
using (bucket_id = 'businesses');

create policy "storage_businesses_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'businesses'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_businesses_owner_update"
on storage.objects for update
using (
  bucket_id = 'businesses'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'businesses'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_businesses_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'businesses'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- 8. Keep updated_at honest on the tables the app maintains by hand.
-- ----------------------------------------------------------------------------
drop trigger if exists on_business_updated on public.businesses;
create trigger on_business_updated
  before update on public.businesses
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

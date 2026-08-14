-- ============================================================================
-- Migration: User Profiles Expansion & Avatars Bucket
-- Date: 2026-08-15
-- ============================================================================

-- 1. Add new columns to profiles
alter table public.profiles 
add column if not exists avatar_url text,
add column if not exists mobile_number text,
add column if not exists birth_date date,
add column if not exists bio text;

-- 2. Create Avatars Storage Bucket
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Security Policies for 'avatars' bucket

-- Public can view all images in 'avatars' bucket
drop policy if exists "Public Access for Avatars" on storage.objects;
create policy "Public Access for Avatars"
on storage.objects for select
using (bucket_id = 'avatars');

-- Authenticated users can upload to 'avatars' bucket
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.role() = 'authenticated'
);

-- Users can only update their own avatars
drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  and auth.uid() = owner
)
with check (
  bucket_id = 'avatars' 
  and auth.uid() = owner
);

-- Users can only delete their own avatars
drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects for delete
using (
  bucket_id = 'avatars' 
  and auth.uid() = owner
);

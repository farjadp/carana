-- ============================================================================
-- Migration: Add Media Columns to User Interactions & Create user-media Bucket
-- Date: 2026-08-18
-- ============================================================================

-- 1. Add media columns to user_business_interactions
alter table public.user_business_interactions
  add column if not exists private_media_urls  text[]    default '{}',
  add column if not exists private_media_types text[]    default '{}';

-- 2. Create private storage bucket for user media
insert into storage.buckets (id, name, public)
values ('user-media', 'user-media', false)
on conflict (id) do nothing;

-- 3. Storage RLS — users can only access their own folder
drop policy if exists "user-media owner select"   on storage.objects;
drop policy if exists "user-media owner insert"   on storage.objects;
drop policy if exists "user-media owner update"   on storage.objects;
drop policy if exists "user-media owner delete"   on storage.objects;

create policy "user-media owner select"
on storage.objects for select
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user-media owner insert"
on storage.objects for insert
with check (bucket_id = 'user-media' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user-media owner update"
on storage.objects for update
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user-media owner delete"
on storage.objects for delete
using (bucket_id = 'user-media' and (storage.foldername(name))[1] = auth.uid()::text);

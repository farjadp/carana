-- ============================================================================
-- Migration: Setup Supabase Storage for Businesses
-- Date: 2026-08-13
-- ============================================================================

-- Create a new bucket named 'businesses' if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('businesses', 'businesses', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Security Policies for 'businesses' bucket
-- ----------------------------------------------------------------------------

-- 1. Public can view all images in 'businesses' bucket
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
on storage.objects for select
using (bucket_id = 'businesses');

-- 2. Authenticated users can upload images to 'businesses' bucket
drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'businesses' 
  and auth.role() = 'authenticated'
);

-- 3. Users can only update their own files
drop policy if exists "Users can update own files" on storage.objects;
create policy "Users can update own files"
on storage.objects for update
using (
  bucket_id = 'businesses' 
  and auth.uid() = owner
)
with check (
  bucket_id = 'businesses' 
  and auth.uid() = owner
);

-- 4. Users can only delete their own files
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'businesses' 
  and auth.uid() = owner
);

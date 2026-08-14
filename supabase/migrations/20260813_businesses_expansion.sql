-- ============================================================================
-- Migration: Expand Businesses Table for Onboarding
-- Date: 2026-08-13
-- ============================================================================

-- 1. Create Enums
create type public.business_status as enum (
  'DRAFT',
  'SUBMITTED',
  'NEEDS_CHANGES',
  'APPROVED',
  'PUBLISHED',
  'REJECTED'
);

-- 2. Add New Columns to public.businesses
alter table public.businesses
  add column if not exists status public.business_status not null default 'DRAFT',
  add column if not exists name_en text,
  add column if not exists sub_category text,
  add column if not exists short_description text,
  add column if not exists established_year integer,
  add column if not exists ownership_status text,
  
  add column if not exists country text default 'Canada',
  add column if not exists province text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists is_address_public boolean default true,
  add column if not exists service_type text,
  add column if not exists service_area text,
  
  add column if not exists whatsapp text,
  add column if not exists contact_email text,
  add column if not exists instagram text,
  add column if not exists telegram text,
  add column if not exists linkedin text,
  add column if not exists google_maps_url text,
  add column if not exists preferred_contact text,
  
  add column if not exists business_number text,
  add column if not exists license_info text,
  add column if not exists verification_documents text[],
  add column if not exists languages text[],
  add column if not exists is_iranian_owned boolean,
  add column if not exists verification_notes text,
  
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists brand_color text,
  add column if not exists tagline text,
  
  add column if not exists working_hours jsonb default '{}'::jsonb,
  add column if not exists accepts_appointments boolean default false,
  add column if not exists booking_url text;

-- 3. Update existing records
update public.businesses set status = 'PUBLISHED' where is_published = true;
update public.businesses set status = 'DRAFT' where is_published = false;

-- 4. RLS Policies Update
-- Make sure the public can only read PUBLISHED businesses
drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read"
on public.businesses
for select
using (status = 'PUBLISHED' or public.is_admin(auth.uid()) or auth.uid() = created_by);

-- Ensure users can update their own drafts
drop policy if exists "businesses_owner_update" on public.businesses;
create policy "businesses_owner_update"
on public.businesses
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- 5. Drop the old boolean
-- Note: It's safer to keep it for now if other queries rely on it, but we'll drop it to enforce the new state machine.
alter table public.businesses drop column if exists is_published cascade;

-- ============================================================================
-- Migration: Fix Existing APPROVED Businesses to PUBLISHED
-- Date: 2026-08-17
-- Why: Ensure all approved businesses pass Supabase Storage & Database RLS policies.
-- ============================================================================

-- Update status to PUBLISHED for all approved records so public RLS policy allows viewing
update public.businesses 
set status = 'PUBLISHED'
where status = 'APPROVED';

-- Update RLS policy on businesses table to accept both APPROVED and PUBLISHED statuses
drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read"
on public.businesses
for select
using (status = 'PUBLISHED' or status = 'APPROVED' or public.is_admin(auth.uid()) or auth.uid() = created_by);

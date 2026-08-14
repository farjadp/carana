-- ============================================================================
-- Migration: Backfill province and publish the location-less import backlog
-- Date: 2026-08-23
-- Why: 409 rows came in from the directory export with no city, so they were
--      held as DRAFT — a listing with no location had nowhere to appear. Now
--      that the directory browses by province as well as city, a province is
--      enough to place them, and the source is a Greater Toronto directory.
-- ============================================================================

-- 1. Normalise the province spellings already in the table.
update public.businesses set province = 'Ontario'          where province in ('ON', 'on', 'Ont', 'Ontario ');
update public.businesses set province = 'British Columbia' where province in ('BC', 'bc');
update public.businesses set province = 'Quebec'           where province in ('QC', 'qc', 'Québec');

-- 2. Place the backlog in Ontario and publish it.
--    City stays 'نامشخص' so an admin can still find and complete these rows;
--    the city listings filter that value out.
update public.businesses
set province = 'Ontario',
    status   = 'PUBLISHED'
where province is null
  and status = 'DRAFT'
  and city = 'نامشخص';

-- 3. Index the columns the province and city listing pages filter on.
create index if not exists idx_businesses_province on public.businesses (province);
create index if not exists idx_businesses_city     on public.businesses (city);
create index if not exists idx_businesses_status   on public.businesses (status);

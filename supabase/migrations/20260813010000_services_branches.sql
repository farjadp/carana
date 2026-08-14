-- ============================================================================
-- Migration: Add services, branches, and google_maps_url to businesses table
-- Date: 2026-08-13
-- Why: Support dynamic service/price lists, multiple branch addresses,
--      and Google Maps embed for business profiles.
-- ============================================================================

-- 1. آدرس گوگل‌مپ برای نمایش نقشه تعبیه‌شده در پروفایل
alter table public.businesses
  add column if not exists google_maps_url text;

-- 2. لیست سرویس‌ها، محصولات و تعرفه‌ها (آرایه JSONB)
-- فرمت: [{ name, description, price, price_unit, price_note }, ...]
alter table public.businesses
  add column if not exists services jsonb default '[]'::jsonb;

-- 3. آدرس شعب اضافی (آرایه JSONB)
-- فرمت: [{ name, address, city, phone }, ...]
alter table public.businesses
  add column if not exists branches jsonb default '[]'::jsonb;

-- فهرست سازی برای جستجوی سریع روی services (GIN Index)
create index if not exists idx_businesses_services
  on public.businesses using gin (services);

-- فهرست سازی برای جستجوی سریع روی branches (GIN Index)
create index if not exists idx_businesses_branches
  on public.businesses using gin (branches);

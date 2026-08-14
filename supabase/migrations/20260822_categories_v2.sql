-- ============================================================================
-- Migration: Two new categories + new category artwork
-- Date: 2026-08-22
-- Why: The imported directory contains a large number of auto-repair and IT
--      businesses that had no home in the original ten categories — the
--      classifier was pushing web design into "رویدادها". Artwork moves to a
--      single SVG system (Persian arch + shamseh) served from our own domain.
-- ============================================================================

insert into public.categories (name, slug, icon, image_url, description, display_order)
values
  ('خودرو', 'automotive', '🚗', '/images/categories/automotive.svg',
   'تعمیرگاه، مکانیکی، صافکاری، خرید و فروش خودرو و خدمات جانبی', 95),
  ('خدمات دیجیتال و IT', 'digital-it', '💻', '/images/categories/digital-it.svg',
   'طراحی وب، برنامه‌نویسی، پشتیبانی کامپیوتر، بازاریابی دیجیتال و شبکه', 105)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  image_url = excluded.image_url,
  description = excluded.description,
  display_order = excluded.display_order;

-- Point every category at the new artwork.
update public.categories set image_url = '/images/categories/' || slug || '.svg'
where slug in (
  'restaurant-cafe', 'medical-clinic', 'legal-immigration',
  'real-estate-mortgage', 'accounting-tax', 'beauty-wellness',
  'iranian-grocery', 'education', 'skilled-trades', 'events',
  'automotive', 'digital-it'
);

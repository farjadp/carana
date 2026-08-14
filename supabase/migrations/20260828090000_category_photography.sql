-- ============================================================================
-- Migration: Point categories at the new photography
-- Date: 2026-08-28
--
-- The category artwork was hand-coded SVG path data. The handover called it
-- "adequate, not good", and it was the weakest asset in the project — the
-- first attempt had also used a pointed arch and an eight-pointed star and
-- read as Islamic rather than Iranian.
--
-- Replaced with a single editorial photography campaign: twelve images shot
-- through one shared art direction, generated per category rather than as a
-- grid. Each represents its category through a real detail or object rather
-- than a staged scene of a professional at work.
-- ============================================================================

update public.categories
   set image_url = '/images/categories/' || slug || '.webp'
 where slug in (
   'restaurant-cafe',
   'medical-clinic',
   'legal-immigration',
   'real-estate-mortgage',
   'accounting-tax',
   'beauty-wellness',
   'iranian-grocery',
   'education',
   'skilled-trades',
   'events',
   'automotive',
   'digital-it'
 );

-- Anything still pointing at the retired SVG set would render a 404 into a
-- card. There should be none, but a stale row is cheaper to null than to
-- discover in production.
update public.categories
   set image_url = null
 where image_url like '/images/categories/%.svg';

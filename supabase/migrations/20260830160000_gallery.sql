-- ============================================================================
-- Migration: gallery photos + one video, tiered by plan
-- Date: 2026-08-16
--
-- First real slice of the Free/Starter/Premium feature rework: free = 3
-- photos, Starter = 5 photos + 1 video, Premium = unlimited photos (video
-- stays capped at one file — bandwidth, not entitlement, is the limit; see
-- lib/billing/plans.ts GALLERY_LIMITS for the enforced counts and the note
-- on why video isn't "unlimited" too).
--
-- gallery_urls is separate from logo_url/cover_url on purpose: those are
-- the identity of the card everywhere it's listed, this is profile-only
-- detail, and a caller that forgets to select it just gets an empty
-- gallery instead of a broken card.
-- ============================================================================

alter table public.businesses
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists gallery_video_url text;

comment on column public.businesses.gallery_urls is
  'Profile-only photo gallery beyond logo_url/cover_url. Count is capped by
   plan (see lib/billing/plans.ts GALLERY_LIMITS) — enforced in the app, not
   here, same as every other entitlement.';
comment on column public.businesses.gallery_video_url is
  'One video slot, available from the Starter plan up. Capped at one file
   regardless of plan.';

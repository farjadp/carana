-- ============================================================================
-- Migration: Add logo_url and social_media to businesses table
-- Date: 2026-08-18
-- Why: Support storing business logo URLs and social media links (as JSONB).
-- ============================================================================

alter table public.businesses
  add column if not exists logo_url text,
  add column if not exists social_media jsonb default '{}'::jsonb;

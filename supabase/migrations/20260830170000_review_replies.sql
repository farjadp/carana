-- ============================================================================
-- Migration: owner replies to reviews (Starter+ feature)
-- Date: 2026-08-16
--
-- No RLS policy lets a business owner UPDATE a row in public_reviews — only
-- the review's author or an admin can (see 20260814_user_interactions.sql).
-- That's correct and stays that way: the reply is written through a server
-- action with the service role, after the action proves both ownership of
-- the business and that its plan actually includes "review_replies"
-- (lib/billing/entitlements.ts). RLS was never the gate for this feature;
-- it's the reason the gate has to live in application code instead.
-- ============================================================================

alter table public.public_reviews
  add column if not exists owner_reply text,
  add column if not exists owner_reply_at timestamptz;

comment on column public.public_reviews.owner_reply is
  'Public reply from the business owner, gated on plan (review_replies
   feature). Written only by lib/actions/interactions.ts::replyToReview,
   never directly by the client — RLS does not grant owners UPDATE here.';

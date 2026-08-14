-- ============================================================================
-- Migration: Owner verification with a six-month lifetime
-- Date: 2026-08-24
--
-- Two ways a listing becomes verified, and they prove different things:
--
--   self_onboarded — the person registered, added the business themselves, and
--                    proved control of their own email and mobile number.
--
--   claimed        — the listing was imported by us. The claimant proved
--                    control of the phone number that was *already published*
--                    on that listing. They do not choose the destination; the
--                    listing does. That is the whole point: it separates the
--                    real owner from someone who merely says they are.
--
-- Verification is not permanent. A number that was answered six months ago is
-- not evidence today — businesses close, numbers get reassigned, staff leave.
-- Every verification carries an expiry and has to be renewed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Verification state on the listing
-- ----------------------------------------------------------------------------
alter table public.businesses
  add column if not exists owner_user_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists verification_method text
    check (verification_method in ('self_onboarded', 'claimed')),
  add column if not exists verified_at timestamptz,
  add column if not exists verified_until timestamptz,
  -- The exact values that were proven. Kept so that editing the phone number
  -- can invalidate the badge: verification is of a contact point, not of a row.
  add column if not exists verified_phone text,
  add column if not exists verified_email text,
  add column if not exists verification_reminder_sent_at timestamptz;

comment on column public.businesses.verified_until is
  'Verification expires here. Renewal re-proves both contact points.';

comment on column public.businesses.verified_phone is
  'The number that was actually proven. If businesses.phone changes away from
   this value the badge must be treated as void — see lib/verification/status.ts';

-- Public profile pages sort and filter on this constantly.
create index if not exists idx_businesses_verified_until
  on public.businesses (verified_until)
  where verified_until is not null;

create index if not exists idx_businesses_owner_user
  on public.businesses (owner_user_id)
  where owner_user_id is not null;

-- ----------------------------------------------------------------------------
-- 2. Reuse the hardened OTP primitive for business codes
--
--    verification_codes already does the hard parts correctly: hashed at rest,
--    attempt cap, resend cooldown, consumed_at, and no client-facing RLS
--    policy. Extending it beats writing a second, weaker copy for claims.
-- ----------------------------------------------------------------------------
alter table public.verification_codes
  add column if not exists business_id uuid
    references public.businesses(id) on delete cascade;

alter table public.verification_codes
  drop constraint if exists verification_codes_type_check;

alter table public.verification_codes
  add constraint verification_codes_type_check
  check (type in ('phone', 'email', 'business_phone', 'business_email'));

create index if not exists idx_verification_codes_business
  on public.verification_codes (business_id, type)
  where business_id is not null;

-- The original plaintext column, superseded by code_hash in the security
-- hardening migration. Nothing has read it since; every insert has been
-- passing an empty string to satisfy NOT NULL. A column that exists to store
-- one-time codes in the clear only has to be read once to matter.
alter table public.verification_codes
  drop column if exists code;

-- ----------------------------------------------------------------------------
-- 3. Claims record how ownership was proven, not just that it was
-- ----------------------------------------------------------------------------
alter table public.business_claims
  add column if not exists verified_at timestamptz,
  add column if not exists verified_phone text,
  add column if not exists method text
    check (method in ('sms_to_listed_number', 'manual_review'));

-- ----------------------------------------------------------------------------
-- 4. Backfill: every listing imported by us is unverified, which is correct.
--    Listings someone built through onboarding are also unverified until they
--    complete the flow — no badge is granted retroactively on the strength of
--    a row having existed.
-- ----------------------------------------------------------------------------
-- (intentionally no backfill)

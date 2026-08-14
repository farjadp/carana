-- ============================================================================
-- Migration: Contact Verification (6-month rule)
-- Date: 2026-08-19
-- ============================================================================

-- 1. Add verification tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 2. Create verification_codes table for OTPs
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('phone', 'email')),
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_type ON public.verification_codes(user_id, type);

-- RLS Policies
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own verification codes"
ON public.verification_codes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

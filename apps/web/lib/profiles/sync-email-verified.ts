// ============================================================================
// Source: lib/profiles/sync-email-verified.ts
// Version: 1.0.0 — 2026-08-27
// Why: `auth.users.email_confirmed_at` and `profiles.email_verified_at` are
//      two columns holding one fact — "we have proof this account's address
//      belongs to whoever is using it" — and nothing kept them in step.
//
//      Confirming the signup link set the first and left the second null, so a
//      brand-new account was asked to verify, by a six-digit code, the exact
//      address it had just proved by clicking a link mailed to it. Worse than
//      the duplication: `email_verified_at` is half of the gate on
//      /dashboard/business/new, so the answer to "why can't I register my
//      business" was a verification the person had already done.
//
//      The real fix is the trigger in
//      supabase/migrations/20260830480000_email_verified_follows_auth.sql —
//      one source of truth, propagated, covering the mobile app and every
//      future sign-in path. This helper is the half that ships without a
//      human: it reconciles on the paths the web app controls, and does
//      nothing once the trigger is live.
// Env / Identity: Server-only; writes through the admin client because a user
//      may not update their own verification columns (security_hardening).
// ============================================================================
import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Stamp `profiles.email_verified_at` from the auth record when Supabase has
 * confirmed the address and the profile has not caught up.
 *
 * Idempotent and cheap: one SELECT, and an UPDATE at most once per account
 * per confirmation. Uses the confirmation's own timestamp, not now() — the
 * six-month window has to count from when the proof happened.
 *
 * Never throws. This runs alongside page loads and a sign-in must not fail
 * because a reconciliation did.
 */
export async function syncEmailVerifiedFromAuth(user: User | null | undefined): Promise<void> {
  const confirmedAt = user?.email_confirmed_at;
  if (!user || !confirmedAt) return;

  try {
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email_verified_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return;

    // Already stamped at or after the confirmation: nothing to do. The `>=`
    // matters — someone who verified in-app after confirming has a later
    // timestamp, and moving it backwards would shorten their window.
    if (profile.email_verified_at && new Date(profile.email_verified_at) >= new Date(confirmedAt)) {
      return;
    }

    await admin
      .from("profiles")
      .update({ email_verified_at: confirmedAt })
      .eq("id", user.id);
  } catch (error) {
    console.error("email_verified_at sync failed:", error);
  }
}

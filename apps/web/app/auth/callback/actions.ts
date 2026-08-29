// ============================================================================
// Source: app/auth/callback/actions.ts
// Version: 1.0.0 — 2026-08-27
// Why: The half of the auth callback that needs a server: exchanging a PKCE
//      `?code=` for a session writes auth cookies, and only a Server Action or
//      a Route Handler may write cookies. The other half — the implicit
//      response, where Supabase returns the session in the URL fragment —
//      cannot be done here at all, because a fragment never leaves the
//      browser. That half lives in callback-client.tsx.
// Env / Identity: Server Action. Uses the acting user's own session cookies.
// ============================================================================
"use server";

import { headers } from "next/headers";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { syncEmailVerifiedFromAuth } from "@/lib/profiles/sync-email-verified";

type Result = { ok: true } | { ok: false; code: string; reason?: string };

/** Exchange a PKCE code. The verifier lives in a cookie this request carries. */
export async function completeCodeExchange(code: string): Promise<Result> {
  const supabase = await createSupabaseActionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // `pkce_verifier_missing` is the one worth naming: it means the link was
    // opened in a different browser from the one that started the flow —
    // which is what happens when the mail is opened on a phone.
    const missingVerifier = /verifier|code_verifier|invalid request/i.test(error.message);
    return {
      ok: false,
      code: missingVerifier ? "wrong_browser" : "exchange_failed",
      reason: error.message,
    };
  }

  // Supabase has just confirmed this address; the profile column that gates
  // business registration has to hear about it.
  await syncEmailVerifiedFromAuth(data.user);
  await recordLogin(data.user?.id, "code_exchange");
  return { ok: true };
}

/**
 * Establish a session from tokens that arrived in the URL fragment.
 *
 * The browser has already called setSession() with these, which writes the
 * @supabase/ssr cookies; this call exists so the server sees the same session
 * within the same request cycle and can log the sign-in.
 */
export async function recordFragmentLogin(userId: string | null) {
  const supabase = await createSupabaseActionClient();
  const { data } = await supabase.auth.getUser();
  await syncEmailVerifiedFromAuth(data.user);
  await recordLogin(userId ?? data.user?.id ?? null, "fragment");
}

async function recordLogin(userId: string | null | undefined, method: string) {
  if (!userId) return;
  try {
    const supabase = await createSupabaseActionClient();
    const h = await headers();
    const forwardedFor = h.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : h.get("x-real-ip") || "unknown";
    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      action: "LOGIN",
      ip_address: ipAddress,
      metadata: { method },
    });
  } catch {
    // A missing activity log must never cost someone their sign-in.
  }
}

/**
 * Send the confirmation link again.
 *
 * Deliberately answers the same way whether or not the address has an account:
 * this endpoint is reachable by anyone, and a different answer for a known
 * address turns it into a way to test which emails are registered.
 */
export async function resendConfirmation(email: string): Promise<{ ok: boolean; message: string }> {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, message: "این ایمیل معتبر نیست." };
  }

  const supabase = await createSupabaseActionClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: address });
  if (error) console.error("resend confirmation failed:", error.message);

  return {
    ok: true,
    message: "اگر این ایمیل حساب تأییدنشده‌ای داشته باشد، لینک تازه برایش فرستاده شد. صندوق ورودی و spam را ببین.",
  };
}

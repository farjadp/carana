// ============================================================================
// Source: app/dashboard/verify-contact/actions.ts
// Version: 3.0.0 — 2026-08-15
// Why: Issue and check contact-verification codes from the web dashboard.
//      v3: the logic moved to lib/verification/contact-codes.ts so the mobile
//      API applies the identical rules; this file only resolves the session.
// Env / Identity: Codes are hashed at rest and never returned to the client.
// ============================================================================
"use server";

import { toLatinDigits } from "@goplaza/core";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { checkContactCode, issueContactCode } from "@/lib/verification/contact-codes";

export async function sendVerificationCode(type: "email" | "phone") {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "کاربر وارد نشده است." };
  return issueContactCode(user.id, type, user.email);
}

export async function verifyCode(type: "email" | "phone", code: string) {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "کاربر وارد نشده است." };
  return checkContactCode(user.id, type, code);
}

/**
 * Save the mobile number from the verification page itself.
 *
 * It used to live only on /profile, so someone who pressed «کد پیامکی» with no
 * number on file was told to go and find another page — and four of them
 * pressed the button again instead. Eleven of the sixteen recorded code
 * failures are that one dead end.
 *
 * Changing the number clears `phone_verified_at`: the old proof was about the
 * old number, and leaving it would let someone verify one handset and then
 * publish another. Same rule the listing badge follows.
 */
export async function saveMobileNumber(raw: string) {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "کاربر وارد نشده است." };

  // toLatinDigits first: the app forces RTL, so the keyboard opens in Persian
  // and «۶۴۷…» would be stored as-is and never match a dialable number.
  const digits = toLatinDigits(raw).replace(/[^\d+]/g, "").trim();
  const bare = digits.replace(/\D/g, "");
  if (bare.length < 10 || bare.length > 15) {
    return { success: false as const, error: "شماره موبایل کامل نیست. مثل ۴۱۶۵۵۵۰۱۲۳ یا +۱۴۱۶۵۵۵۰۱۲۳." };
  }

  const admin = createSupabaseAdminClient();
  const { data: current } = await admin
    .from("profiles")
    .select("mobile_number")
    .eq("id", user.id)
    .maybeSingle();

  const changed = (current?.mobile_number ?? "").replace(/\D/g, "") !== bare;
  const { error } = await admin
    .from("profiles")
    .update({
      mobile_number: digits,
      ...(changed ? { phone_verified_at: null } : {}),
    })
    .eq("id", user.id);

  if (error) {
    console.error("saveMobileNumber failed:", error);
    return { success: false as const, error: "ذخیره‌ی شماره ناموفق بود." };
  }

  return { success: true as const, mobile: digits };
}

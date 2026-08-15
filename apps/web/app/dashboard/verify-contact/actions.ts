// ============================================================================
// Source: app/dashboard/verify-contact/actions.ts
// Version: 3.0.0 — 2026-08-15
// Why: Issue and check contact-verification codes from the web dashboard.
//      v3: the logic moved to lib/verification/contact-codes.ts so the mobile
//      API applies the identical rules; this file only resolves the session.
// Env / Identity: Codes are hashed at rest and never returned to the client.
// ============================================================================
"use server";

import { createSupabaseActionClient } from "@/lib/supabase/server";
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

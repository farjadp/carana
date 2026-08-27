// ============================================================================
// Source: lib/verification/contact-codes.ts
// Version: 1.0.0 — 2026-08-15
// Why: Issue and check email/phone verification codes for a given user. Split
//      out of the dashboard server action so the mobile API can share the
//      exact same rules (TTL, attempt cap, resend cooldown, hashed at rest).
// Env / Identity: Server only. Uses the admin client because
//      verification_codes has no client-facing RLS policy by design. Callers
//      must have already authenticated the user; this file trusts `userId`.
// ============================================================================
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { verificationCodeEmail } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/send";

export const CODE_TTL_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export type ContactType = "email" | "phone";
export type CodeResult = { success: true; message?: string; error?: undefined } | { success: false; error: string; message?: undefined };

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function safeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Issue a fresh code and deliver it. `email` is the account's email (needed
 * for the email channel); the phone number is always read from the profile
 * so a caller can never point a code at an arbitrary handset.
 */
export async function issueContactCode(
  userId: string,
  type: ContactType,
  email: string | null | undefined
): Promise<CodeResult> {
  const admin = createSupabaseAdminClient();

  const { data: recent } = await admin
    .from("verification_codes")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.created_at) {
    const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return {
        success: false,
        error: `لطفاً ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} ثانیه دیگر دوباره تلاش کنید.`,
      };
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await admin.from("verification_codes").delete().eq("user_id", userId).eq("type", type);

  const { error: dbError } = await admin.from("verification_codes").insert({
    user_id: userId,
    type,
    code_hash: hashCode(code),
    expires_at: expiresAt.toISOString(),
  });
  if (dbError) {
    console.error("Verification code insert error:", dbError);
    return { success: false, error: "خطا در ایجاد کد تایید." };
  }

  if (type === "email") {
    if (!email) return { success: false, error: "ایمیلی برای این حساب ثبت نشده است." };
    const { subject, html, text } = verificationCodeEmail(code);
    const result = await sendEmail({ to: email, subject, html, text });
    if (!result.sent && process.env.NODE_ENV === "production") {
      return { success: false, error: "ارسال ایمیل انجام نشد. دوباره تلاش کنید." };
    }
    return { success: true, message: "کد تایید به ایمیل شما ارسال شد." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("mobile_number")
    .eq("id", userId)
    .maybeSingle();
  const mobile = profile?.mobile_number?.trim();
  if (!mobile) {
    return { success: false, error: "ابتدا شماره موبایل خود را در پروفایل ثبت کنید." };
  }

  const result = await sendSms(
    mobile,
    `کد تایید پلازا: ${code}\n\nاین کد تا ۱۵ دقیقه معتبر است. آن را با کسی به اشتراک نگذارید.`
  );
  if (!result.sent) return { success: false, error: result.error ?? "ارسال پیامک انجام نشد." };
  return { success: true, message: "کد تایید به موبایل شما پیامک شد." };
}

/** Check a code and, on success, stamp the matching *_verified_at on the profile. */
export async function checkContactCode(
  userId: string,
  type: ContactType,
  code: string
): Promise<CodeResult> {
  if (!/^\d{6}$/.test(code)) return { success: false, error: "کد باید ۶ رقم باشد." };

  const admin = createSupabaseAdminClient();
  const { data: latest, error: fetchError } = await admin
    .from("verification_codes")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("user_id", userId)
    .eq("type", type)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !latest) return { success: false, error: "کدی یافت نشد. لطفاً دوباره درخواست دهید." };
  if (new Date(latest.expires_at) < new Date()) return { success: false, error: "این کد منقضی شده است." };
  if (latest.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: "تعداد تلاش‌های مجاز تمام شد. لطفاً کد جدیدی درخواست کنید." };
  }
  if (!latest.code_hash || !safeEquals(latest.code_hash, hashCode(code))) {
    await admin.from("verification_codes").update({ attempts: latest.attempts + 1 }).eq("id", latest.id);
    return { success: false, error: "کد وارد شده اشتباه است." };
  }

  const stamp =
    type === "email"
      ? { email_verified_at: new Date().toISOString() }
      : { phone_verified_at: new Date().toISOString() };
  const { error: updateError } = await admin.from("profiles").update(stamp).eq("id", userId);
  if (updateError) {
    console.error("Verification flag update error:", updateError);
    return { success: false, error: "خطا در ثبت تاییدیه." };
  }
  await admin.from("verification_codes").update({ consumed_at: new Date().toISOString() }).eq("id", latest.id);
  return { success: true };
}

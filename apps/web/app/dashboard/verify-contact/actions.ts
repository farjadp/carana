// ============================================================================
// Source: app/dashboard/verify-contact/actions.ts
// Version: 2.0.0 — 2026-08-20
// Why: Issue and check contact-verification codes.
// Env / Identity: Codes are hashed at rest and never returned to the client.
//      Reads/writes go through the admin client because verification_codes has
//      no client-facing RLS policy by design.
// ============================================================================
"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { verificationCodeEmail } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/send";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function safeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function sendVerificationCode(type: "email" | "phone") {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "کاربر وارد نشده است." };

  const admin = createSupabaseAdminClient();

  // Throttle resends so this cannot be used to spam a phone number.
  const { data: recent } = await admin
    .from("verification_codes")
    .select("created_at")
    .eq("user_id", user.id)
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

  // randomInt is cryptographically secure; Math.random() is not.
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  // Invalidate any outstanding codes of this type before issuing a new one.
  await admin
    .from("verification_codes")
    .delete()
    .eq("user_id", user.id)
    .eq("type", type);

  const { error: dbError } = await admin.from("verification_codes").insert({
    user_id: user.id,
    type,
    code: "",
    code_hash: hashCode(code),
    expires_at: expiresAt.toISOString(),
  });

  if (dbError) {
    console.error("Verification code insert error:", dbError);
    return { success: false, error: "خطا در ایجاد کد تایید." };
  }

  // The code is deliberately never returned to the client — putting it in the
  // response would let anyone verify without receiving the message.
  if (type === "email") {
    const target = user.email;
    if (!target) {
      return { success: false, error: "ایمیلی برای این حساب ثبت نشده است." };
    }

    const { subject, html, text } = verificationCodeEmail(code);
    const result = await sendEmail({ to: target, subject, html, text });

    if (!result.sent && process.env.NODE_ENV === "production") {
      return { success: false, error: "ارسال ایمیل انجام نشد. دوباره تلاش کنید." };
    }

    return { success: true, message: "کد تایید به ایمیل شما ارسال شد." };
  }

  // Phone. The number comes from the profile, not from the request — a caller
  // must not be able to point a verification code at an arbitrary handset.
  const { data: profile } = await admin
    .from("profiles")
    .select("mobile_number")
    .eq("id", user.id)
    .maybeSingle();

  const mobile = profile?.mobile_number?.trim();
  if (!mobile) {
    return {
      success: false,
      error: "ابتدا شماره موبایل خود را در صفحه پروفایل ثبت کنید.",
    };
  }

  const result = await sendSms(
    mobile,
    `کد تایید چارانا: ${code}\n\nاین کد تا ۱۵ دقیقه معتبر است. آن را با کسی به اشتراک نگذارید.`
  );

  if (!result.sent) {
    return { success: false, error: result.error ?? "ارسال پیامک انجام نشد." };
  }

  return { success: true, message: "کد تایید به موبایل شما پیامک شد." };
}

export async function verifyCode(type: "email" | "phone", code: string) {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "کاربر وارد نشده است." };

  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: "کد باید ۶ رقم باشد." };
  }

  const admin = createSupabaseAdminClient();

  const { data: latest, error: fetchError } = await admin
    .from("verification_codes")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("user_id", user.id)
    .eq("type", type)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !latest) {
    return { success: false, error: "کدی یافت نشد. لطفاً دوباره درخواست دهید." };
  }

  if (new Date(latest.expires_at) < new Date()) {
    return { success: false, error: "این کد منقضی شده است." };
  }

  if (latest.attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      error: "تعداد تلاش‌های مجاز تمام شد. لطفاً کد جدیدی درخواست کنید.",
    };
  }

  if (!latest.code_hash || !safeEquals(latest.code_hash, hashCode(code))) {
    await admin
      .from("verification_codes")
      .update({ attempts: latest.attempts + 1 })
      .eq("id", latest.id);

    return { success: false, error: "کد وارد شده اشتباه است." };
  }

  const updateData =
    type === "email"
      ? { email_verified_at: new Date().toISOString() }
      : { phone_verified_at: new Date().toISOString() };

  const { error: updateError } = await admin
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (updateError) {
    console.error("Verification flag update error:", updateError);
    return { success: false, error: "خطا در ثبت تاییدیه." };
  }

  await admin
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", latest.id);

  return { success: true };
}

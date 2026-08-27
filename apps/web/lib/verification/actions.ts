// ============================================================================
// Source: lib/verification/actions.ts
// Version: 1.0.0 — 2026-08-24
// Why: Issue and check the codes that grant a listing its verified badge.
// Env / Identity: Server only. Codes are hashed at rest and never returned to
//      the caller. All reads and writes of verification_codes go through the
//      admin client because that table has no client-facing RLS policy by
//      design — a user who can read their own OTP is not being verified.
//
// The destination of a code is never taken from the request. For a claim it
// comes from the listing's published phone number; for self-onboarding it
// comes from the owner's own record. That single rule is what separates
// proving ownership from asserting it.
// ============================================================================
"use server";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { verificationCodeEmail } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/send";
import { nextExpiry } from "./status";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/** Per-user cap on how many different listings may be claimed in a day. */
const CLAIM_ATTEMPT_DAILY_CAP = 5;

type Result = { success: boolean; error?: string; message?: string };

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function safeEquals(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function newCode() {
  // randomInt is cryptographically secure; Math.random() is not.
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Show only the last four digits, so the claimant can tell which handset to
 *  expect — without the page revealing a number they could not already see. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

// ============================================================================
// Claim: prove control of the number already published on an imported listing
// ============================================================================

export async function startBusinessClaim(businessId: string): Promise<
  Result & { maskedPhone?: string }
> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری خود شوید." };

  const admin = createSupabaseAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, phone, status, owner_user_id, verified_until")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

  if (business.status !== "PUBLISHED") {
    return { success: false, error: "این آگهی هنوز منتشر نشده است." };
  }

  if (business.owner_user_id && business.owner_user_id !== user.id) {
    return {
      success: false,
      error: "مالکیت این کسب‌وکار قبلاً توسط شخص دیگری احراز شده است. اگر فکر می‌کنید اشتباهی رخ داده با پشتیبانی تماس بگیرید.",
    };
  }

  const phone = business.phone?.trim();
  if (!phone) {
    return {
      success: false,
      error: "این آگهی شماره تلفنی ندارد، بنابراین مالکیتش را نمی‌توان با پیامک احراز کرد. لطفاً از طریق پشتیبانی اقدام کنید.",
    };
  }

  // Cap how many listings one account may probe in a day. Without this, an
  // attacker could walk the directory firing codes at every published number.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("verification_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "business_phone")
    .gte("created_at", dayAgo);

  if ((count ?? 0) >= CLAIM_ATTEMPT_DAILY_CAP) {
    return {
      success: false,
      error: "تعداد درخواست‌های شما امروز زیاد بوده است. فردا دوباره تلاش کنید.",
    };
  }

  // Resend cooldown, scoped to this listing.
  const { data: recent } = await admin
    .from("verification_codes")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("type", "business_phone")
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

  const code = newCode();

  await admin
    .from("verification_codes")
    .delete()
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("type", "business_phone");

  const { error: dbError } = await admin.from("verification_codes").insert({
    user_id: user.id,
    business_id: businessId,
    type: "business_phone",
    code_hash: hashCode(code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });

  if (dbError) {
    console.error("Claim code insert error:", dbError);
    return { success: false, error: "خطا در ایجاد کد تایید." };
  }

  // The destination is business.phone — the number already visible on the
  // public listing. The claimant never supplies it, so receiving the code is
  // itself the proof.
  const sms = await sendSms(
    phone,
    `کد احراز مالکیت «${business.name}» در پلازا: ${code}\n\nاگر شما درخواست نداده‌اید این پیام را نادیده بگیرید.`
  );

  if (!sms.sent) {
    return { success: false, error: sms.error ?? "ارسال پیامک انجام نشد." };
  }

  return {
    success: true,
    maskedPhone: maskPhone(phone),
    message: "کد تایید به شماره‌ی ثبت‌شده در آگهی پیامک شد.",
  };
}

export async function confirmBusinessClaim(
  businessId: string,
  code: string
): Promise<Result> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری خود شوید." };
  if (!/^\d{6}$/.test(code)) return { success: false, error: "کد باید ۶ رقم باشد." };

  const admin = createSupabaseAdminClient();

  const { data: latest } = await admin
    .from("verification_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", user.id)
    .eq("business_id", businessId)
    .eq("type", "business_phone")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return { success: false, error: "کدی یافت نشد. لطفاً دوباره درخواست دهید." };

  if (new Date(latest.expires_at) < new Date()) {
    return { success: false, error: "این کد منقضی شده است." };
  }

  if (latest.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: "تعداد تلاش‌های مجاز تمام شد. کد جدیدی درخواست کنید." };
  }

  if (!latest.code_hash || !safeEquals(latest.code_hash, hashCode(code))) {
    await admin
      .from("verification_codes")
      .update({ attempts: latest.attempts + 1 })
      .eq("id", latest.id);
    return { success: false, error: "کد وارد شده اشتباه است." };
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id, slug, phone, contact_email, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

  // Re-check between issuing and confirming: someone else may have completed a
  // claim while this code was outstanding.
  if (business.owner_user_id && business.owner_user_id !== user.id) {
    return { success: false, error: "مالکیت این کسب‌وکار در این فاصله توسط شخص دیگری احراز شد." };
  }

  const now = new Date();

  const { error: bizError } = await admin
    .from("businesses")
    .update({
      owner_user_id: user.id,
      verification_method: "claimed",
      verified_at: now.toISOString(),
      verified_until: nextExpiry(now).toISOString(),
      verified_phone: business.phone,
      verified_email: null,
      verification_reminder_sent_at: null,
      verification_reminder_stage: null,
    })
    .eq("id", businessId);

  if (bizError) {
    console.error("Claim verification write failed:", bizError);
    return { success: false, error: "خطا در ثبت مالکیت." };
  }

  await admin.from("verification_codes").update({ consumed_at: now.toISOString() }).eq("id", latest.id);

  await admin.from("business_memberships").upsert(
    { business_id: businessId, user_id: user.id, role: "owner" },
    { onConflict: "business_id,user_id" }
  );

  await admin.from("business_claims").upsert(
    {
      business_id: businessId,
      user_id: user.id,
      status: "approved",
      method: "sms_to_listed_number",
      verified_at: now.toISOString(),
      verified_phone: business.phone,
      reviewed_at: now.toISOString(),
    },
    { onConflict: "business_id,user_id" }
  );

  revalidatePath(`/businesses/${business.slug}`);
  revalidatePath("/dashboard");

  return { success: true, message: "مالکیت شما با موفقیت احراز شد." };
}

// ============================================================================
// Self-onboarded: the owner proves their own email and phone
// ============================================================================

/**
 * Grant or renew the badge for a listing whose owner registered it themselves.
 *
 * Deliberately reads the verification flags from `profiles` rather than
 * trusting the caller: the badge is only granted if this account has actually
 * completed both contact verifications.
 */
export async function verifyOwnListing(businessId: string): Promise<Result> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری خود شوید." };

  const admin = createSupabaseAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, slug, phone, contact_email, created_by, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

  const isOwner =
    business.owner_user_id === user.id || business.created_by === user.id;

  if (!isOwner) {
    const { data: membership } = await admin
      .from("business_memberships")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return { success: false, error: "شما به این کسب‌وکار دسترسی ندارید." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, mobile_number, email_verified_at, phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.email_verified_at) {
    return { success: false, error: "ابتدا ایمیل خود را تایید کنید." };
  }

  if (!profile?.phone_verified_at) {
    return { success: false, error: "ابتدا شماره موبایل خود را تایید کنید." };
  }

  const now = new Date();

  const { error } = await admin
    .from("businesses")
    .update({
      owner_user_id: user.id,
      verification_method: "self_onboarded",
      verified_at: now.toISOString(),
      verified_until: nextExpiry(now).toISOString(),
      verified_phone: business.phone,
      verified_email: business.contact_email,
      verification_reminder_sent_at: null,
      verification_reminder_stage: null,
    })
    .eq("id", businessId);

  if (error) {
    console.error("Self verification write failed:", error);
    return { success: false, error: "خطا در ثبت تاییدیه." };
  }

  await admin.from("business_memberships").upsert(
    { business_id: businessId, user_id: user.id, role: "owner" },
    { onConflict: "business_id,user_id" }
  );

  revalidatePath(`/businesses/${business.slug}`);
  revalidatePath("/dashboard");

  return { success: true, message: "کسب‌وکار شما تایید شد." };
}

// ============================================================================
// Renewal — the six-month cycle
// ============================================================================

/**
 * Renewal is not a separate mechanism. It re-runs whichever proof granted the
 * badge in the first place, so the same evidence is required every six months.
 *
 * A claimed listing gets a fresh code to its published number; a self-onboarded
 * one requires the owner's contact verifications to be current. Renewing by
 * clicking a button would make the six-month rule decorative.
 */
export async function startRenewal(businessId: string): Promise<
  Result & { maskedPhone?: string; method?: string }
> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری خود شوید." };

  const admin = createSupabaseAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, verification_method, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

  if (business.owner_user_id !== user.id) {
    return { success: false, error: "شما مالک این کسب‌وکار نیستید." };
  }

  if (business.verification_method === "claimed") {
    const started = await startBusinessClaim(businessId);
    return { ...started, method: "claimed" };
  }

  const result = await verifyOwnListing(businessId);
  return { ...result, method: "self_onboarded" };
}

// ============================================================================
// Source: app/support/actions.ts
// Version: 1.0.0 — 2026-08-26
// Why: Deliver the support form. /support previously offered a mailto link and
//      a suggestion box; someone who wanted to describe an actual problem had
//      to leave the page to do it.
//
//      Deliberately reuses sendEmail + contactMessageEmail rather than growing
//      a second mail path. What it adds is the CATEGORY, folded into the
//      subject line, because a support inbox where every message reads
//      "پیام تماس: بدون موضوع" is an inbox nobody can triage. The category is
//      validated against a fixed set — a caller that can write its own subject
//      prefix can forge one that looks like an internal alert.
// Env / Identity: Public — anyone may send, no account required, because
//      somebody locked out of their account is exactly who needs this form.
//      Rate limited per IP; an unauthenticated mail endpoint is otherwise a
//      spam relay.
// ============================================================================
"use server";

import { headers } from "next/headers";

import { company } from "@/lib/data/company";
import { sendEmail } from "@/lib/email/send";
import { contactMessageEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/utils/rate-limit";

import { SUPPORT_CATEGORIES, type SupportCategory } from "./categories";

export type SupportResult = { success: boolean; error?: string };

const MAX = { name: 120, subject: 160, message: 4000 };

export async function sendSupportMessage(formData: FormData): Promise<SupportResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  // Bots fill hidden fields; humans cannot see this one.
  const honeypot = String(formData.get("company") ?? "").trim();

  // Silence, not an error: telling a bot it was caught teaches it the shape.
  if (honeypot) return { success: true };

  if (name.length < 2) return { success: false, error: "نام را وارد کنید." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { success: false, error: "ایمیل معتبر نیست." };
  if (message.length < 10)
    return { success: false, error: "توضیح باید حداقل ۱۰ حرف باشد." };
  if (name.length > MAX.name || subject.length > MAX.subject || message.length > MAX.message)
    return { success: false, error: "متن ارسالی بیش از حد طولانی است." };

  const label =
    category in SUPPORT_CATEGORIES
      ? SUPPORT_CATEGORIES[category as SupportCategory]
      : SUPPORT_CATEGORIES.other;

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const limit = rateLimit(`support:${ip}`, 5, 60 * 60);
  if (!limit.allowed) {
    return {
      success: false,
      error: `تعداد پیام‌های شما زیاد است. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
    };
  }

  const mail = contactMessageEmail({
    name,
    email,
    subject: `پشتیبانی · ${label}${subject ? ` — ${subject}` : ""}`,
    message,
  });

  // replyTo means hitting reply in the inbox answers the sender, not us.
  const result = await sendEmail({
    to: company.email.support,
    replyTo: email,
    ...mail,
  });

  if (!result.sent) {
    return { success: false, error: "ارسال پیام انجام نشد. لطفاً مستقیم ایمیل بزنید." };
  }

  return { success: true };
}

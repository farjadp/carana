// ============================================================================
// Source: app/contact/actions.ts
// Version: 1.0.0 — 2026-08-24
// Why: Deliver the contact form. It was a visual placeholder that went nowhere.
// Env / Identity: Public — anyone may send. Rate limited per IP because an
//      unauthenticated mail endpoint is otherwise a spam relay.
// ============================================================================
"use server";

import { headers } from "next/headers";

import { company } from "@/lib/data/company";
import { sendEmail } from "@/lib/email/send";
import { contactMessageEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/utils/rate-limit";

export type ContactResult = { success: boolean; error?: string };

const MAX = { name: 120, subject: 160, message: 4000 };

export async function sendContactMessage(formData: FormData): Promise<ContactResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Bots fill hidden fields; humans cannot see this one.
  const honeypot = String(formData.get("company") ?? "").trim();

  if (honeypot) return { success: true };

  if (name.length < 2) return { success: false, error: "نام را وارد کنید." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { success: false, error: "ایمیل معتبر نیست." };
  if (message.length < 10)
    return { success: false, error: "پیام باید حداقل ۱۰ حرف باشد." };

  if (name.length > MAX.name || subject.length > MAX.subject || message.length > MAX.message)
    return { success: false, error: "متن ارسالی بیش از حد طولانی است." };

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60);
  if (!limit.allowed) {
    return {
      success: false,
      error: `تعداد پیام‌های شما زیاد است. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
    };
  }

  const mail = contactMessageEmail({
    name,
    email,
    subject: subject || "بدون موضوع",
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

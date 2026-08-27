// ============================================================================
// Source: app/complaint/actions.ts
// Version: 1.0.0 — 2026-08-26
// Why: Deliver a formal complaint. Distinct from the support form on purpose:
//      support is "help me use this", a complaint is "something was done
//      wrong", and the two want different fields, different routing and a
//      different promise about what happens next.
//
//      WHAT THIS DOES NOT DO: it does not mint a tracking number. There is no
//      complaints table — that needs a migration this project cannot apply
//      from here — so the confirmation says only what is true: the message was
//      sent, to which mailbox, and by when we answer. Printing a fake case id
//      would be the exact class of lie the house rules ban, and the first
//      thing a complainant would quote back at us.
//
//      Routing comes from COMPLAINT_CATEGORIES[].route so the privacy queue
//      and its 30-day clock stay the ones /privacy already promises.
// Env / Identity: Public — no account required. Somebody complaining about
//      being locked out cannot be asked to log in first. Rate limited per IP.
// ============================================================================
"use server";

import { headers } from "next/headers";

import { company } from "@/lib/data/company";
import { sendEmail } from "@/lib/email/send";
import { contactMessageEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/utils/rate-limit";

import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_OUTCOMES,
  type ComplaintCategory,
  type ComplaintOutcome,
} from "./categories";

export type ComplaintResult = {
  success: boolean;
  error?: string;
  /** Which mailbox it went to, so the UI can name it instead of implying one. */
  sentTo?: string;
};

const MAX = { name: 120, subject: 200, phone: 40, message: 6000 };

export async function submitComplaint(formData: FormData): Promise<ComplaintResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const honeypot = String(formData.get("company") ?? "").trim();

  // Silence, not an error: telling a bot it was caught teaches it the shape.
  if (honeypot) return { success: true, sentTo: company.email.management };

  if (name.length < 2) return { success: false, error: "نام را وارد کنید." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { success: false, error: "ایمیل معتبر نیست." };
  // A complaint with two lines of detail cannot be investigated.
  if (message.length < 30)
    return { success: false, error: "شرح شکایت باید دست‌کم ۳۰ حرف باشد تا بتوانیم بررسی کنیم." };
  if (
    name.length > MAX.name ||
    subject.length > MAX.subject ||
    phone.length > MAX.phone ||
    message.length > MAX.message
  )
    return { success: false, error: "متن ارسالی بیش از حد طولانی است." };

  const cat =
    category in COMPLAINT_CATEGORIES
      ? COMPLAINT_CATEGORIES[category as ComplaintCategory]
      : COMPLAINT_CATEGORIES.other;

  const wanted =
    outcome in COMPLAINT_OUTCOMES
      ? COMPLAINT_OUTCOMES[outcome as ComplaintOutcome]
      : COMPLAINT_OUTCOMES.other;

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  // Tighter than the support form: a complaint is a considered act, and three
  // an hour from one address is not somebody being careful.
  const limit = rateLimit(`complaint:${ip}`, 3, 60 * 60);
  if (!limit.allowed) {
    return {
      success: false,
      error: `تعداد شکایت‌های ثبت‌شده از این دستگاه زیاد است. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید یا مستقیم ایمیل بزنید.`,
    };
  }

  const to = cat.route === "privacy" ? company.email.privacy : company.email.management;

  const body = [
    `دسته: ${cat.label}`,
    `خواسته: ${wanted}`,
    subject ? `مورد شکایت: ${subject}` : null,
    phone ? `تلفن تماس: ${phone}` : null,
    "",
    "شرح:",
    message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const mail = contactMessageEmail({
    name,
    email,
    subject: `شکایت · ${cat.label}`,
    message: body,
  });

  // replyTo means hitting reply answers the complainant, not us.
  const result = await sendEmail({ to, replyTo: email, ...mail });

  if (!result.sent) {
    return { success: false, error: "ثبت شکایت انجام نشد. لطفاً مستقیم ایمیل بزنید." };
  }

  return { success: true, sentTo: to };
}

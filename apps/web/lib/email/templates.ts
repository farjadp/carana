// ============================================================================
// Source: apps/web/lib/email/templates.ts
// Version: 1.0.0 — 2026-08-24
// Why: Persian RTL email bodies. Every message ships a plain-text part too —
//      some clients refuse HTML, and a text part improves deliverability.
// Env / Identity: Pure strings, no secrets.
// ============================================================================
import { company } from "@/lib/data/company";

const CREAM = "#f6f1e8";
const ANNABI = "#800000";
const NAVY = "#14213d";
const MUTED = "#5f6472";

/**
 * Email clients strip <style> and ignore most modern CSS, so everything is
 * inline and table-free. `dir="rtl"` on the body is what Outlook actually
 * honours.
 */
function shell(bodyHtml: string) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<body style="margin:0;padding:0;background:${CREAM};font-family:Tahoma,Arial,sans-serif;" dir="rtl">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;color:${ANNABI};">${company.brand}</span>
    </div>

    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;color:${NAVY};font-size:15px;line-height:2;">
      ${bodyHtml}
    </div>

    <div style="text-align:center;margin-top:20px;color:${MUTED};font-size:12px;line-height:1.9;">
      <div>${company.brandFa} — دایرکتوری کسب‌وکارهای ایرانی کانادا</div>
      <div>${company.legalName} · ${company.address}</div>
      <div style="margin-top:6px;">
        <a href="https://charana.ca/privacy" style="color:${MUTED};">حریم خصوصی</a> ·
        <a href="https://charana.ca/support" style="color:${MUTED};">پشتیبانی</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function verificationCodeEmail(code: string) {
  return {
    subject: `کد تایید ${company.brandFa}: ${code}`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">کد تایید شما برای ${company.brandFa} این است:</p>
      <div style="text-align:center;margin:22px 0;">
        <span style="display:inline-block;background:${CREAM};color:${ANNABI};font-size:30px;font-weight:bold;letter-spacing:8px;padding:14px 24px;border-radius:10px;direction:ltr;">${code}</span>
      </div>
      <p style="margin:0 0 10px;color:${MUTED};font-size:13px;">این کد تا ۱۵ دقیقه معتبر است.</p>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر شما این کد را درخواست نکرده‌اید، این ایمیل را نادیده بگیرید. کسی بدون دسترسی به این کد نمی‌تواند وارد حساب شما شود.</p>
    `),
    text: `کد تایید ${company.brandFa}: ${code}\n\nاین کد تا ۱۵ دقیقه معتبر است.\nاگر شما آن را درخواست نکرده‌اید، این ایمیل را نادیده بگیرید.`,
  };
}

export function listingApprovedEmail(input: { name: string; slug: string }) {
  const url = `https://charana.ca/businesses/${encodeURIComponent(input.slug)}`;
  return {
    subject: `«${input.name}» در ${company.brandFa} منتشر شد`,
    html: shell(`
      <p style="margin:0 0 14px;">خبر خوب،</p>
      <p style="margin:0 0 18px;">کسب‌وکار <strong>${input.name}</strong> بررسی شد و اکنون در دایرکتوری ${company.brandFa} منتشر شده است.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">مشاهده صفحه کسب‌وکار</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">هر زمان می‌توانید اطلاعات را از داشبورد ویرایش کنید.</p>
    `),
    text: `کسب‌وکار «${input.name}» در ${company.brandFa} منتشر شد.\n${url}`,
  };
}

export function listingNeedsChangesEmail(input: { name: string; reason?: string }) {
  return {
    subject: `«${input.name}» نیاز به اصلاح دارد`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">هنگام بررسی <strong>${input.name}</strong> مواردی پیدا شد که پیش از انتشار باید اصلاح شود.</p>
      ${
        input.reason
          ? `<div style="background:${CREAM};border-radius:10px;padding:14px 16px;margin:0 0 18px;">${input.reason}</div>`
          : ""
      }
      <div style="text-align:center;margin:24px 0;">
        <a href="https://charana.ca/dashboard/business" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">ویرایش کسب‌وکار</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر سؤالی دارید به ${company.email.support} بنویسید.</p>
    `),
    text: `«${input.name}» نیاز به اصلاح دارد.\n${input.reason ?? ""}\nhttps://charana.ca/dashboard/business`,
  };
}

export function contactMessageEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return {
    subject: `پیام تماس: ${input.subject}`,
    html: shell(`
      <p style="margin:0 0 14px;"><strong>از:</strong> ${input.name} &lt;${input.email}&gt;</p>
      <p style="margin:0 0 14px;"><strong>موضوع:</strong> ${input.subject}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
      <div style="white-space:pre-wrap;">${input.message}</div>
    `),
    text: `از: ${input.name} <${input.email}>\nموضوع: ${input.subject}\n\n${input.message}`,
  };
}

/**
 * The six-month renewal reminder.
 *
 * Tone shifts with urgency rather than repeating one message louder. At 30
 * days this is housekeeping; at 7 it is a deadline; once lapsed the badge is
 * already gone from the public page and the mail has to say so plainly rather
 * than imply it.
 */
export function verificationRenewalEmail(input: {
  name: string;
  daysRemaining: number;
  stage: 30 | 7 | 0;
}) {
  const url = "https://charana.ca/dashboard/business";
  const fa = (n: number) =>
    String(Math.abs(n)).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

  const lapsed = input.stage === 0;

  const subject = lapsed
    ? `تایید «${input.name}» منقضی شد`
    : input.stage === 7
      ? `${fa(input.daysRemaining)} روز تا انقضای تایید «${input.name}»`
      : `تمدید تایید «${input.name}» — ${fa(input.daysRemaining)} روز مانده`;

  const lead = lapsed
    ? `نشان تایید <strong>${input.name}</strong> منقضی شده و از صفحه‌ی عمومی آن برداشته شده است. کسب‌وکار همچنان در دایرکتوری هست، اما بدون نشان تایید.`
    : `تایید <strong>${input.name}</strong> تا ${fa(input.daysRemaining)} روز دیگر منقضی می‌شود.`;

  return {
    subject,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">${lead}</p>
      <p style="margin:0 0 18px;">چارانا هر شش ماه یک‌بار شماره تماس و ایمیل هر کسب‌وکار را دوباره تایید می‌کند. این کاری است که باعث می‌شود نشان تایید معنا داشته باشد: کاربری که آن را می‌بیند مطمئن است اطلاعات تماس همین چند ماه اخیر بررسی شده، نه یک بار در گذشته.</p>
      <p style="margin:0 0 18px;">تمدید چند ثانیه طول می‌کشد و از داشبورد انجام می‌شود.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">${lapsed ? "تمدید تایید" : "تمدید کنید"}</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر شماره تماس کسب‌وکارتان عوض شده، اول آن را در داشبورد به‌روز کنید و بعد تمدید بزنید.</p>
    `),
    text: `${subject}\n\n${lapsed ? `نشان تایید «${input.name}» منقضی شده و از صفحه‌ی عمومی برداشته شده است.` : `تایید «${input.name}» تا ${fa(input.daysRemaining)} روز دیگر منقضی می‌شود.`}\n\nتمدید از داشبورد:\n${url}`,
  };
}

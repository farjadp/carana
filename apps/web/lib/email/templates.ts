// ============================================================================
// Source: apps/web/lib/email/templates.ts
// Version: 1.0.0 — 2026-08-24
// Why: Persian RTL email bodies. Every message ships a plain-text part too —
//      some clients refuse HTML, and a text part improves deliverability.
// Env / Identity: Pure strings, no secrets.
// ============================================================================
import { brand } from "@goplaza/core";

import { company } from "@/lib/data/company";

const CREAM = "#f6f1e8";
const ANNABI = "#7A1831";
const NAVY = "#14213d";
const MUTED = "#5f6472";

/**
 * Email clients strip <style> and ignore most modern CSS, so everything is
 * inline and table-free. `dir="rtl"` on the body is what Outlook actually
 * honours.
 */
/**
 * Escape text that came from a stranger before it goes into an HTML email.
 *
 * The contact and support forms are open to anyone, and their output lands in
 * a human's inbox. Without this, a sender can post `<a href="...">` — or an
 * invisible style block — straight into the mail the support team reads, which
 * turns our own transactional mail into a phishing carrier. Escape at the
 * point of interpolation; the plain-text part needs no escaping.
 */
function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
        <a href="${brand.url}/privacy" style="color:${MUTED};">حریم خصوصی</a> ·
        <a href="${brand.url}/support" style="color:${MUTED};">پشتیبانی</a>
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
  const url = `${brand.url}/businesses/${encodeURIComponent(input.slug)}`;
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
        <a href="${brand.url}/dashboard/business" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">ویرایش کسب‌وکار</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر سؤالی دارید به ${company.email.support} بنویسید.</p>
    `),
    text: `«${input.name}» نیاز به اصلاح دارد.\n${input.reason ?? ""}\n${brand.url}/dashboard/business`,
  };
}

/**
 * Sent only to users who explicitly opted in (notify_announcements = true
 * on their own saved-business row) — never inferred from "saved" alone.
 * See lib/actions/announcements.ts::createAnnouncement.
 */
export function newAnnouncementEmail(input: {
  businessName: string;
  businessSlug: string;
  title: string;
  body?: string | null;
}) {
  const url = `${brand.url}/businesses/${encodeURIComponent(input.businessSlug)}`;
  return {
    subject: `اعلان تازه از ${input.businessName}: ${input.title}`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;"><strong>${input.businessName}</strong> که دنبالش می‌کنی، اعلان تازه‌ای گذاشته:</p>
      <div style="background:${CREAM};border-radius:10px;padding:16px 18px;margin:0 0 18px;">
        <div style="font-weight:bold;margin:0 0 6px;">${input.title}</div>
        ${input.body ? `<div style="color:${MUTED};font-size:14px;">${input.body}</div>` : ""}
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">دیدن پروفایل</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">این ایمیل را می‌گیری چون تصمیم گرفتی از اعلان‌های این کسب‌وکار باخبر شوی — از پروفایلش یا <a href="${brand.url}/profile/interactions" style="color:${MUTED};">دفترچه‌ی خودت</a> می‌توانی خاموشش کنی.</p>
    `),
    text: `${input.businessName} اعلان تازه گذاشت: ${input.title}\n${input.body ?? ""}\n${url}\n\nاین ایمیل را می‌گیری چون از اعلان‌های این کسب‌وکار باخبر می‌شوی — از پروفایلش می‌توانی خاموشش کنی.`,
  };
}

/**
 * Moderation outcome, to the person who wrote the review.
 *
 * Until now this was silence: a rejected review left `moderation_reason`
 * filled in a column nobody ever read. Someone who took the time to write
 * about a business deserves to know what happened to it, and a rejection
 * without a reason reads as arbitrary.
 */
export function reviewModeratedEmail(input: {
  businessName: string;
  businessSlug: string;
  outcome: "published" | "needs_changes" | "rejected";
  reason?: string | null;
}) {
  const url = `${brand.url}/businesses/${encodeURIComponent(input.businessSlug)}`;
  const mine = `${brand.url}/profile/interactions`;

  if (input.outcome === "published") {
    return {
      subject: `نظرت درباره‌ی ${input.businessName} منتشر شد`,
      html: shell(`
        <p style="margin:0 0 14px;">ممنون که وقت گذاشتی،</p>
        <p style="margin:0 0 18px;">نظرت درباره‌ی <strong>${input.businessName}</strong> بررسی شد و حالا روی پروفایلش منتشر است.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">دیدن نظرت</a>
        </div>
        <p style="margin:0;color:${MUTED};font-size:13px;">هر وقت خواستی می‌توانی از <a href="${mine}" style="color:${MUTED};">دفترچه‌ی خودت</a> ویرایشش کنی.</p>
      `),
      text: `نظرت درباره‌ی ${input.businessName} منتشر شد.\n${url}`,
    };
  }

  const needsChanges = input.outcome === "needs_changes";
  return {
    subject: needsChanges
      ? `نظرت درباره‌ی ${input.businessName} نیاز به اصلاح دارد`
      : `نظرت درباره‌ی ${input.businessName} منتشر نشد`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">${
        needsChanges
          ? `نظرت درباره‌ی <strong>${input.businessName}</strong> بررسی شد و پیش از انتشار به اصلاح نیاز دارد.`
          : `نظرت درباره‌ی <strong>${input.businessName}</strong> بررسی شد و منتشر نشد.`
      }</p>
      ${
        input.reason
          ? `<div style="background:${CREAM};border-radius:10px;padding:14px 16px;margin:0 0 18px;"><strong>دلیل:</strong><br>${input.reason}</div>`
          : ""
      }
      ${
        needsChanges
          ? `<div style="text-align:center;margin:24px 0;">
               <a href="${mine}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">ویرایش نظر</a>
             </div>`
          : ""
      }
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر فکر می‌کنی اشتباهی شده، به ${company.email.support} بنویس.</p>
    `),
    text: `${needsChanges ? "نظرت نیاز به اصلاح دارد" : "نظرت منتشر نشد"} — ${input.businessName}\n${input.reason ?? ""}\n${mine}`,
  };
}

/** New published review, to the business owner. */
export function newReviewEmail(input: {
  businessName: string;
  businessSlug: string;
  rating: number;
  title?: string | null;
  body: string;
  canReply: boolean;
}) {
  const url = `${brand.url}/businesses/${encodeURIComponent(input.businessSlug)}`;
  const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
  return {
    subject: `نظر تازه درباره‌ی ${input.businessName}`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">نظر تازه‌ای درباره‌ی <strong>${input.businessName}</strong> منتشر شد.</p>
      <div style="background:${CREAM};border-radius:10px;padding:16px 18px;margin:0 0 18px;">
        <div style="color:${ANNABI};font-size:18px;letter-spacing:2px;direction:ltr;">${stars}</div>
        ${input.title ? `<div style="font-weight:bold;margin:6px 0 4px;">${input.title}</div>` : ""}
        <div style="color:${MUTED};font-size:14px;">${input.body}</div>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">${input.canReply ? "دیدن و پاسخ دادن" : "دیدن نظر"}</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">${
        input.canReply
          ? "می‌توانی زیر نظر، پاسخ عمومی بگذاری."
          : "پاسخ عمومی به نظرات از پلن استارتر به بالا فعال می‌شود."
      }</p>
    `),
    text: `نظر تازه درباره‌ی ${input.businessName} (${input.rating} از ۵)\n${input.title ?? ""}\n${input.body}\n${url}`,
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
      <p style="margin:0 0 14px;"><strong>از:</strong> ${esc(input.name)} &lt;${esc(input.email)}&gt;</p>
      <p style="margin:0 0 14px;"><strong>موضوع:</strong> ${esc(input.subject)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
      <div style="white-space:pre-wrap;">${esc(input.message)}</div>
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
  const url = `${brand.url}/dashboard/business`;
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
      <p style="margin:0 0 18px;">پلازا هر شش ماه یک‌بار شماره تماس و ایمیل هر کسب‌وکار را دوباره تایید می‌کند. این کاری است که باعث می‌شود نشان تایید معنا داشته باشد: کاربری که آن را می‌بیند مطمئن است اطلاعات تماس همین چند ماه اخیر بررسی شده، نه یک بار در گذشته.</p>
      <p style="margin:0 0 18px;">تمدید چند ثانیه طول می‌کشد و از داشبورد انجام می‌شود.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">${lapsed ? "تمدید تایید" : "تمدید کنید"}</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر شماره تماس کسب‌وکارتان عوض شده، اول آن را در داشبورد به‌روز کنید و بعد تمدید بزنید.</p>
    `),
    text: `${subject}\n\n${lapsed ? `نشان تایید «${input.name}» منقضی شده و از صفحه‌ی عمومی برداشته شده است.` : `تایید «${input.name}» تا ${fa(input.daysRemaining)} روز دیگر منقضی می‌شود.`}\n\nتمدید از داشبورد:\n${url}`,
  };
}

// ---------------------------------------------------------------------------
// Jobs board
// ---------------------------------------------------------------------------

const faDigits = (n: number) =>
  String(Math.abs(n)).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * A moderation decision on a hiring ad, to whoever posted it.
 *
 * Only unverified businesses ever queue, so this is also the moment they meet
 * the verification argument at its most concrete: the same ad from a verified
 * listing would already be live. The rejection carries the moderator's own
 * reason — a rejection without one leaves the poster guessing, which is why
 * moderateJob() refuses to send it.
 */
export function jobModeratedEmail(input: {
  businessName: string;
  jobTitle: string;
  jobSlug: string;
  businessId: string;
  outcome: "published" | "rejected";
  reason?: string | null;
  /** Suppresses the verification nudge for a business that is already verified. */
  isVerified?: boolean;
}) {
  const jobUrl = `${brand.url}/jobs/${encodeURIComponent(input.jobSlug)}`;
  const manageUrl = `${brand.url}/dashboard/business/${input.businessId}/jobs`;

  if (input.outcome === "published") {
    return {
      subject: `آگهی «${input.jobTitle}» منتشر شد`,
      html: shell(`
        <p style="margin:0 0 14px;">سلام،</p>
        <p style="margin:0 0 18px;">آگهی <strong>${input.jobTitle}</strong> برای <strong>${input.businessName}</strong> بررسی شد و حالا روی تابلوی فرصت‌های شغلی پلازا منتشر است.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${jobUrl}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">دیدن آگهی</a>
        </div>
        ${
          input.isVerified
            ? ""
            : `<div style="background:${CREAM};border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:13.5px;">
                 اگر مالکیت این کسب‌وکار را تایید کنی، آگهی‌های بعدی‌ات بدون بررسی و بلافاصله منتشر می‌شوند.
               </div>`
        }
        <p style="margin:0;color:${MUTED};font-size:13px;">هر وقت جای خالی پر شد، از <a href="${manageUrl}" style="color:${MUTED};">پنل آگهی‌ها</a> ببندش. آگهی در تاریخ انقضا هم خودبه‌خود برداشته می‌شود.</p>
      `),
      text: `آگهی «${input.jobTitle}» منتشر شد.\n${jobUrl}\n\nمدیریت آگهی‌ها: ${manageUrl}`,
    };
  }

  return {
    subject: `آگهی «${input.jobTitle}» منتشر نشد`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">آگهی <strong>${input.jobTitle}</strong> برای <strong>${input.businessName}</strong> بررسی شد و منتشر نشد.</p>
      ${
        input.reason
          ? `<div style="background:${CREAM};border-radius:10px;padding:14px 16px;margin:0 0 18px;"><strong>دلیل:</strong><br>${input.reason}</div>`
          : ""
      }
      <p style="margin:0 0 18px;">می‌توانی با در نظر گرفتن همین نکته، آگهی تازه‌ای ثبت کنی.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${manageUrl}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">ثبت آگهی تازه</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;">اگر فکر می‌کنی اشتباهی شده، به ${company.email.support} بنویس.</p>
    `),
    text: `آگهی «${input.jobTitle}» منتشر نشد.\n${input.reason ?? ""}\n\n${manageUrl}`,
  };
}

/**
 * Three days before a hiring ad lapses.
 *
 * Two doors, on purpose. "Extend" and "close" are equally valid answers, and a
 * mail that only offers extend quietly pushes toward a board full of ads for
 * jobs that were filled a month ago — which is the exact failure the expiry
 * rule exists to prevent.
 */
export function jobExpiringEmail(input: {
  businessName: string;
  jobTitle: string;
  jobSlug: string;
  businessId: string;
  daysRemaining: number;
  /** Live apply-clicks, only passed when there are any. */
  applyClicks?: number | null;
}) {
  const manageUrl = `${brand.url}/dashboard/business/${input.businessId}/jobs`;
  const jobUrl = `${brand.url}/jobs/${encodeURIComponent(input.jobSlug)}`;

  return {
    subject: `${faDigits(input.daysRemaining)} روز تا پایان آگهی «${input.jobTitle}»`,
    html: shell(`
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">آگهی <strong>${input.jobTitle}</strong> برای <strong>${input.businessName}</strong> تا ${faDigits(input.daysRemaining)} روز دیگر به پایان می‌رسد و بعد از آن خودبه‌خود از تابلو برداشته می‌شود.</p>
      ${
        // Only rendered when there is a real number behind it — a "0 people
        // clicked" line in a nudge is both discouraging and, on a board this
        // young, mostly noise.
        input.applyClicks
          ? `<div style="background:${CREAM};border-radius:10px;padding:14px 16px;margin:0 0 18px;font-size:14px;">
               تا اینجا <strong>${faDigits(input.applyClicks)} نفر</strong> روی دکمه‌ی درخواست این آگهی زده‌اند.
             </div>`
          : ""
      }
      <p style="margin:0 0 18px;">اگر هنوز دنبال نیرو هستی تمدیدش کن؛ اگر جای خالی پر شده، ببندش. هر دو یک کلیک است.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${manageUrl}" style="display:inline-block;background:${ANNABI};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:bold;">تمدید یا بستن آگهی</a>
      </div>
      <p style="margin:0;color:${MUTED};font-size:13px;"><a href="${jobUrl}" style="color:${MUTED};">دیدن آگهی روی سایت</a> · تمدید، مدت را از همین حالا حساب می‌کند، نه از تاریخ انقضای قبلی.</p>
    `),
    text: `${faDigits(input.daysRemaining)} روز تا پایان آگهی «${input.jobTitle}» (${input.businessName}).\n\nتمدید یا بستن: ${manageUrl}\nدیدن آگهی: ${jobUrl}`,
  };
}

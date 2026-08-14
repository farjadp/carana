// ============================================================================
// Source: lib/moderation/change-review.ts
// Version: 1.0.0 — 2026-08-21
// Why: Decide whether an edit to an already-published listing can go live
//      immediately or has to go back to a human moderator.
// Env / Identity: Server-only. Calls OpenAI for free-text changes.
//
// Design: deterministic rules run first and settle most cases without spending
// a token. The AI is only consulted for free text and outbound links, and it
// can only ever *escalate* — it is never the thing that grants publication to
// a field the rules already marked critical.
// ============================================================================
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export type ChangeDecision = "auto_approve" | "needs_admin";

export type ChangeReview = {
  decision: ChangeDecision;
  changedFields: string[];
  criticalFields: string[];
  reason: string;
  aiVerdict: { verdict: string; reason: string; severity: string } | null;
};

// ----------------------------------------------------------------------------
// Field tiers — tune these; they are the whole policy.
// ----------------------------------------------------------------------------

/**
 * Identity, location and trust claims. Changing any of these can turn an
 * approved listing into a different business, so a human always looks.
 */
const ALWAYS_REVIEW = new Set([
  "name",
  "name_en",
  "category",
  "sub_category",
  "city",
  "province",
  "country",
  "address",
  "ownership_status",
  "business_number",
  "license_info",
  "is_iranian_owned",
  "verification_notes",
  // No image moderation available, so a swapped logo/cover gets a human.
  "logo_url",
  "cover_url",
]);

/**
 * Free text and outbound links. Cheap to check, and the place where a clean
 * listing quietly turns into an advert or a redirect.
 */
const AI_REVIEW = new Set([
  "description",
  "short_description",
  "tagline",
  "services",
  "branches",
  "website",
  "instagram",
  "telegram",
  "linkedin",
  "whatsapp",
  "booking_url",
  "google_maps_url",
]);

// Everything else (hours, brand colour, postal code, languages, phone,
// contact_email, service type/area, established year, appointment flags) is
// treated as operational and publishes immediately.

// ----------------------------------------------------------------------------

function normalise(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const changed: string[] = [];

  for (const key of Object.keys(after)) {
    if (normalise(before[key]) !== normalise(after[key])) {
      changed.push(key);
    }
  }

  return changed;
}

const aiSchema = z.object({
  verdict: z
    .enum(["clean", "needs_review"])
    .describe("clean if the new text is ordinary business copy"),
  severity: z.enum(["none", "low", "medium", "high"]),
  reason: z.string().describe("One short sentence, in Persian"),
});

async function reviewTextChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
) {
  const payload = fields.map((f) => ({
    field: f,
    before: normalise(before[f]).slice(0, 1500),
    after: normalise(after[f]).slice(0, 1500),
  }));

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: aiSchema,
    system: `
شما ناظر محتوای دایرکتوری کسب‌وکارهای ایرانی در کانادا (čārana) هستید.
یک کسب‌وکار که قبلاً تایید و منتشر شده، متن یا لینک‌هایش را ویرایش کرده است.
وظیفه شما تشخیص این است که آیا تغییر عادی است یا باید انسان ببیند.

«needs_review» را انتخاب کنید اگر تغییر شامل یکی از این‌ها باشد:
- تغییر ماهیت کسب‌وکار به حوزه‌ای کاملاً متفاوت
- ادعای پزشکی، حقوقی یا مالی بدون پشتوانه، یا وعده تضمین نتیجه
- ادعای مجوز، گواهی، رتبه یا تاییدیه رسمی
- لینک به دامنه‌ای که با هویت کسب‌وکار همخوانی ندارد، کوتاه‌کننده لینک، یا دامنه مشکوک
- محتوای توهین‌آمیز، سیاسی، تبلیغ قمار/دارو/ارز دیجیتال
- اطلاعات تماس کاشته‌شده داخل متن برای دور زدن پلتفرم
- تغییر قیمت‌ها به شکلی که گمراه‌کننده باشد

«clean» را انتخاب کنید برای بازنویسی معمولی، اصلاح غلط املایی، بهتر کردن لحن،
افزودن جزئیات خدمات، یا به‌روزرسانی عادی لینک‌های رسمی همان کسب‌وکار.
`.trim(),
    prompt: `تغییرات زیر را بررسی کنید:\n\n${JSON.stringify(payload, null, 2)}`,
  });

  return object;
}

/**
 * Classify an edit to a published listing.
 *
 * Fails closed: if the AI call errors out, the change goes to a human rather
 * than being published unreviewed.
 */
export async function reviewListingChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<ChangeReview> {
  const changedFields = diffFields(before, after);

  if (changedFields.length === 0) {
    return {
      decision: "auto_approve",
      changedFields: [],
      criticalFields: [],
      reason: "تغییری اعمال نشد.",
      aiVerdict: null,
    };
  }

  const criticalFields = changedFields.filter((f) => ALWAYS_REVIEW.has(f));

  if (criticalFields.length > 0) {
    return {
      decision: "needs_admin",
      changedFields,
      criticalFields,
      reason: `تغییر در فیلدهای حساس: ${criticalFields.join("، ")}`,
      aiVerdict: null,
    };
  }

  const textFields = changedFields.filter((f) => AI_REVIEW.has(f));

  if (textFields.length === 0) {
    return {
      decision: "auto_approve",
      changedFields,
      criticalFields: [],
      reason: "فقط تغییرات عملیاتی (ساعات کاری، تماس، ظاهر).",
      aiVerdict: null,
    };
  }

  try {
    const verdict = await reviewTextChanges(before, after, textFields);

    if (verdict.verdict === "needs_review") {
      return {
        decision: "needs_admin",
        changedFields,
        criticalFields: [],
        reason: verdict.reason,
        aiVerdict: verdict,
      };
    }

    return {
      decision: "auto_approve",
      changedFields,
      criticalFields: [],
      reason: verdict.reason || "بررسی خودکار مشکلی پیدا نکرد.",
      aiVerdict: verdict,
    };
  } catch (error) {
    console.error("Change review AI error:", error);
    return {
      decision: "needs_admin",
      changedFields,
      criticalFields: [],
      reason: "بررسی خودکار در دسترس نبود؛ ارسال برای بازبینی انسانی.",
      aiVerdict: null,
    };
  }
}

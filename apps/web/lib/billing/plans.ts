// ============================================================================
// Source: lib/billing/plans.ts
// Version: 1.0.0 — 2026-08-16
// Why: One definition of what a plan costs and what it unlocks. The pricing
//      page, the checkout, the entitlement gates and the Stripe seed script
//      all read this, so a price can never be right in one place and wrong in
//      another.
//
//      Two product rules encoded here, both deliberate:
//        1. **Verification is never sold.** The badge means someone proved
//           control of a phone or email. Charging for it would make the one
//           honest signal in the directory purchasable, which is the whole
//           thing this project refuses to do.
//        2. **Featured placement is labelled, never hidden.** A paid listing
//           may sit at the top of a list, but it carries a visible "ویژه"
//           chip. Ranking that quietly favours payers is an unmarked
//           advertisement.
// Env / Identity: Pure data, safe on the client.
// ============================================================================

export type PlanId = "free" | "pro" | "featured";
export type BillingInterval = "month" | "year";

export type Feature =
  | "insights_basic"      // views + total actions, 30 days
  | "insights_full"       // 90 days, per-action breakdown, referrers
  | "gallery"             // more than one image
  | "announcements"       // discounts, events, news on the profile
  | "booking_link"
  | "review_replies"
  | "featured_placement"  // top of its city × category list, labelled
  | "homepage_slot"
  | "priority_support";

export type Plan = {
  id: PlanId;
  name: string;          // Persian, shown to owners
  nameEn: string;
  tagline: string;
  /** Price in cents, CAD. `null` for the free plan. */
  price: Record<BillingInterval, number | null>;
  features: Feature[];
  /** Lines shown on the pricing card, in order. */
  bullets: string[];
  /** Set from STRIPE_PRICE_* after the seed script runs. */
  priceIds?: Partial<Record<BillingInterval, string>>;
};

/** Two months free on the annual price — the usual, and easy to explain. */
const yearly = (monthlyCents: number) => monthlyCents * 10;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "رایگان",
    nameEn: "Free",
    tagline: "همیشه رایگان می‌ماند. ثبت و نشان تأیید هرگز فروشی نیست.",
    price: { month: null, year: null },
    features: ["insights_basic"],
    bullets: [
      "پروفایل کامل با شماره، آدرس، ساعت کاری و خدمات",
      "نشان تأیید بعد از اثبات شماره یا ایمیل — رایگان",
      "حضور در جستجو، دسته‌بندی و صفحه‌ی شهر",
      "آمار پایه: بازدید و مجموع اقدام‌ها (۳۰ روز)",
    ],
  },
  pro: {
    id: "pro",
    name: "حرفه‌ای",
    nameEn: "Pro",
    tagline: "برای کسب‌وکاری که می‌خواهد بداند پروفایلش چه می‌کند و بیشتر بگوید.",
    price: { month: 1900, year: yearly(1900) },
    features: ["insights_basic", "insights_full", "gallery", "announcements", "booking_link", "review_replies"],
    bullets: [
      "آمار کامل: ۹۰ روز، تفکیک هر اقدام، مبدأ بازدید",
      "اعلان‌ها: تخفیف، رویداد، خبر تازه روی پروفایل",
      "گالری تصاویر به‌جای یک عکس",
      "لینک رزرو نوبت",
      "پاسخ عمومی به نظرات",
    ],
  },
  featured: {
    id: "featured",
    name: "ویژه",
    nameEn: "Featured",
    tagline: "بالای فهرست شهر و دسته‌ی خودت — با برچسب «ویژه»، نه پنهانی.",
    price: { month: 4900, year: yearly(4900) },
    features: [
      "insights_basic", "insights_full", "gallery", "announcements", "booking_link",
      "review_replies", "featured_placement", "homepage_slot", "priority_support",
    ],
    bullets: [
      "همه‌ی امکانات حرفه‌ای",
      "جایگاه بالای فهرست شهر و دسته‌ی خودت، با برچسب «ویژه»",
      "حضور در بخش ویژه‌ی صفحه‌ی اول",
      "پشتیبانی با اولویت",
    ],
  },
};

export const PAID_PLANS: PlanId[] = ["pro", "featured"];

export const planOf = (id: string | null | undefined): Plan => PLANS[(id as PlanId) ?? "free"] ?? PLANS.free;

export function planHas(id: string | null | undefined, feature: Feature): boolean {
  return planOf(id).features.includes(feature);
}

/** Price ids come from the environment so test and live can differ. */
export function priceIdFor(plan: PlanId, interval: BillingInterval): string | undefined {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key];
}

export const formatCad = (cents: number) =>
  `${(cents / 100).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} دلار کانادا`;

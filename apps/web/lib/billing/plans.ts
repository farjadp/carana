// ============================================================================
// Source: lib/billing/plans.ts
// Version: 2.0.0 — 2026-08-16
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
//
//      v2 (16 Aug): renamed the product-facing tiers Pro → Starter and
//      Featured → Premium after an audit found most of "Pro"'s bullets
//      (gallery, announcements, review replies) sold features that did not
//      exist yet. `PlanId` stays "pro"/"featured" on purpose — it is the
//      Stripe price env var suffix, the DB check constraint, and what
//      `sortFeaturedFirst`/webhook logic compare against; renaming the
//      internal id would touch all of those for a label change alone. Only
//      `name`/`nameEn` and the feature set changed.
// Env / Identity: Pure data, safe on the client.
// ============================================================================

export type PlanId = "free" | "pro" | "featured";
export type BillingInterval = "month" | "year";

export type Feature =
  | "insights_basic"      // views + total actions, 30 days
  | "insights_full"       // 90 days, per-action breakdown, referrers
  | "announcements"       // discounts, events, news on the profile
  | "booking_link"
  | "review_replies"
  | "busy_status"         // manual, self-expiring "busy now / quiet now"
  | "featured_placement"  // top of its city × category list, labelled
  | "homepage_slot"
  | "priority_support";

/**
 * Gallery and announcements are not yes/no — every plan gets some, the paid
 * tiers get more. `null` means unlimited. Video is capped at one file even
 * on Premium: bandwidth, not entitlement, is the limit on "unlimited".
 */
export const GALLERY_LIMITS: Record<PlanId, { photos: number | null; video: boolean }> = {
  free: { photos: 3, video: false },
  pro: { photos: 5, video: true },
  featured: { photos: null, video: true },
};

export const ANNOUNCEMENT_LIMITS: Record<PlanId, number | null> = {
  free: 1,
  pro: 3,
  featured: null,
};

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
      "۳ عکس گالری",
      "۱ اعلان در ماه",
    ],
  },
  // Product-facing name "استارتر" (Starter). id stays "pro" — see the file
  // header note on why.
  pro: {
    id: "pro",
    name: "استارتر",
    nameEn: "Starter",
    tagline: "برای کسب‌وکاری که می‌خواهد بداند پروفایلش چه می‌کند و بیشتر بگوید.",
    price: { month: 1900, year: yearly(1900) },
    features: ["insights_basic", "insights_full", "announcements", "booking_link", "review_replies", "busy_status"],
    bullets: [
      "آمار کامل: ۹۰ روز، تفکیک هر اقدام، مبدأ بازدید",
      "۵ عکس گالری + ۱ ویدئو",
      "۳ اعلان در ماه: تخفیف، رویداد، خبر تازه",
      "لینک رزرو نوبت — رایگان تا یک سال اول برای اعضای زودهنگام",
      "پاسخ عمومی به نظرات",
      "وضعیت زنده «الان شلوغیم / خلوته»",
    ],
  },
  // Product-facing name "پریمیوم" (Premium). id stays "featured" — same
  // reason: it's what sortFeaturedFirst, the webhook and Stripe env vars
  // compare against.
  featured: {
    id: "featured",
    name: "پریمیوم",
    nameEn: "Premium",
    tagline: "بالای فهرست شهر و دسته‌ی خودت — با برچسب «ویژه»، نه پنهانی.",
    price: { month: 4900, year: yearly(4900) },
    features: [
      "insights_basic", "insights_full", "announcements", "booking_link",
      "review_replies", "busy_status", "featured_placement", "homepage_slot", "priority_support",
    ],
    bullets: [
      "همه‌ی امکانات استارتر",
      "گالری و اعلان نامحدود",
      "آدرس اختصاصی انگلیسی (charana.ca/b/...)",
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

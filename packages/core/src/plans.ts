// ============================================================================
// Source: packages/core/src/plans.ts
// Version: 4.0.0 — 2026-08-19
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
//           advertisement. `FEATURED_RANDOM_BOOST` below extends this rule
//           into the default random listing order rather than breaking it —
//           see the comment on that constant before changing it.
//
//      v2 (16 Aug): renamed the product-facing tiers Pro → Starter and
//      Featured → Premium after an audit found most of "Pro"'s bullets
//      (gallery, announcements, review replies) sold features that did not
//      exist yet. `PlanId` stays "pro"/"featured" on purpose — it is the
//      Stripe price env var suffix, the DB check constraint, and what
//      `sortFeaturedFirst`/webhook logic compare against; renaming the
//      internal id would touch all of those for a label change alone. Only
//      `name`/`nameEn` and the feature set changed.
//      v3 (16 Aug): moved from apps/web/lib/billing/plans.ts into
//      @goplaza/core so the mobile features screen reads the same
//      quantities the web page and the server clamp against — the same
//      move verification-status and live-status already made. A second
//      hand-typed copy of GALLERY_LIMITS on mobile is exactly how a
//      "5 photos" promise drifts from a server that allows 3.
//      apps/web/lib/billing/plans.ts is now a re-export.
//      v3.1 (17 Aug): added `owner_privacy`. The owner section on a verified
//      profile is shown on every plan; Premium is the only one that can turn
//      it off. Note the asymmetry with every other gate here — hiding is
//      honoured after the plan lapses (see the migration note), because what
//      would revert is a person's name, not a placement.
//      v4 (19 Aug): repriced Starter/Premium, added a fourth tier —
//      **Platinum**, `PLATINUM_SEAT_CAP` businesses nationwide, quarterly
//      billing only. Farjad's Platinum feature list is not finalised yet:
//      `features`/`GALLERY_LIMITS`/`ANNOUNCEMENT_LIMITS` give it everything
//      Premium has (the floor a payer above Premium's price must not fall
//      below), but `bullets` says only what is actually decided — price,
//      the seat cap, and "the rest is coming" — never invented perks. Append
//      to `features`/`bullets` together once the list exists.
//      `BillingInterval` gained `"2year"` (Starter, Premium) and `"quarter"`
//      (Platinum only) — not every plan sells every interval, see
//      `intervalsFor`. `PAID_PLANS` order is the sales order, not just the
//      three-then-four id list.
// Env / Identity: Pure data, safe on the client — web and native. The one
//      `process.env` read (priceIdFor) is server-side only in practice;
//      it returns undefined in the Expo bundle, which is correct, because
//      mobile never starts a checkout.
// ============================================================================

export type PlanId = "free" | "pro" | "featured" | "platinum";
export type BillingInterval = "month" | "year" | "2year" | "quarter";

export const INTERVAL_LABEL_FA: Record<BillingInterval, string> = {
  month: "ماهانه",
  year: "سالانه",
  "2year": "دوساله",
  quarter: "سه‌ماهه",
};

export const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  month: 1,
  year: 12,
  "2year": 24,
  quarter: 3,
};

export type Feature =
  | "insights_basic"      // views + total actions, 30 days
  | "insights_full"       // 90 days, per-action breakdown, referrers
  | "announcements"       // discounts, events, news on the profile
  | "booking_link"
  | "review_replies"
  | "busy_status"         // manual, self-expiring "busy now / quiet now"
  | "vanity_url"          // GoPlaza.ca/b/[custom-english-slug]
  | "featured_placement"  // top of its city × category list, labelled; also
                           // the gate for FEATURED_RANDOM_BOOST below
  | "homepage_slot"
  | "owner_privacy"       // hide the "owner" section on the public profile
  | "priority_support";

/**
 * Gallery and announcements are not yes/no — every plan gets some, the paid
 * tiers get more. `null` means unlimited. Video is capped at one file even
 * on Premium/Platinum: bandwidth, not entitlement, is the limit on
 * "unlimited".
 */
export const GALLERY_LIMITS: Record<PlanId, { photos: number | null; video: boolean }> = {
  free: { photos: 3, video: false },
  pro: { photos: 5, video: true },
  featured: { photos: null, video: true },
  platinum: { photos: null, video: true },
};

export const ANNOUNCEMENT_LIMITS: Record<PlanId, number | null> = {
  free: 1,
  pro: 3,
  featured: null,
  platinum: null,
};

/**
 * How much more likely a `featured_placement` business is to be drawn early
 * in the default, unsorted listing order (see `weightedRandomOrder` in
 * apps/web/lib/billing/entitlements.ts) — 0.89 means 89% more selection
 * weight than a non-featured row (weight 1 + 0.89 = 1.89, vs 1.0).
 *
 * This is still rule #2 above, not an exception to it: the boosted result is
 * only legitimate because BusinessCard renders the "ویژه" chip on every
 * featured listing wherever it appears, including the default random view —
 * a visitor can always tell why a listing is where it is. It is a paid boost
 * inside a shuffle, not a guaranteed top slot: the order is still genuinely
 * random on every load. Do not raise this without updating the /pricing FAQ
 * answer that states it, and do not apply it anywhere the chip is not shown.
 */
export const FEATURED_RANDOM_BOOST = 0.89;

/** Only ever this many businesses may hold Platinum at once, nationwide. */
export const PLATINUM_SEAT_CAP = 21;

export type Plan = {
  id: PlanId;
  name: string;          // Persian, shown to owners
  nameEn: string;
  tagline: string;
  /** Price in cents, CAD, keyed by interval. `null` where the plan does not sell that interval. */
  price: Record<BillingInterval, number | null>;
  features: Feature[];
  /** Lines shown on the pricing card, in order. Only confirmed claims. */
  bullets: string[];
  /** Set from STRIPE_PRICE_* after the seed script runs. */
  priceIds?: Partial<Record<BillingInterval, string>>;
};

/** The intervals a plan actually sells, in display order. */
export function intervalsFor(id: PlanId): BillingInterval[] {
  const plan = PLANS[id];
  return (["month", "year", "2year", "quarter"] as const).filter((i) => plan.price[i] !== null);
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "رایگان",
    nameEn: "Free",
    tagline: "همیشه رایگان می‌ماند. ثبت و نشان تأیید هرگز فروشی نیست.",
    price: { month: null, year: null, "2year": null, quarter: null },
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
    price: { month: 2100, year: 14400, "2year": 37700, quarter: null },
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
    price: { month: 3400, year: 37700, "2year": 61000, quarter: null },
    features: [
      "insights_basic", "insights_full", "announcements", "booking_link",
      "review_replies", "busy_status", "vanity_url", "featured_placement", "homepage_slot",
      "owner_privacy", "priority_support",
    ],
    bullets: [
      "همه‌ی امکانات استارتر",
      "گالری و اعلان نامحدود",
      "آدرس اختصاصی انگلیسی (GoPlaza.ca/b/...)",
      "جایگاه بالای فهرست شهر و دسته‌ی خودت، با برچسب «ویژه»",
      "وزن بیشتر در ترتیب پیش‌فرض (تصادفی) فهرست‌ها — همچنان با برچسب «ویژه»",
      "حضور در بخش ویژه‌ی صفحه‌ی اول",
      "اختیار نمایش یا پنهان کردن نام صاحب کسب‌وکار",
      "پشتیبانی با اولویت",
    ],
  },
  // A scarce tier above Premium. Only PLATINUM_SEAT_CAP businesses may hold
  // it at once (enforced at checkout, see api/stripe/checkout/route.ts), and
  // it sells quarterly only — no month/year/2year price exists on purpose.
  // features/limits floor at Premium's until Farjad supplies the exclusive
  // list; bullets says exactly that, nothing more.
  platinum: {
    id: "platinum",
    name: "پلاتینیوم",
    nameEn: "Platinum",
    tagline: `فقط ${PLATINUM_SEAT_CAP} جایگاه در کل کانادا. فصلی، محدود، و برای همین ارزشمند.`,
    price: { month: null, year: null, "2year": null, quarter: 14400 },
    features: [
      "insights_basic", "insights_full", "announcements", "booking_link",
      "review_replies", "busy_status", "vanity_url", "featured_placement", "homepage_slot",
      "owner_privacy", "priority_support",
    ],
    bullets: [
      `محدود به ${PLATINUM_SEAT_CAP} کسب‌وکار — وقتی پر شد، تا خالی نشدن یک جایگاه نمی‌توانی بخری`,
      "همه‌ی امکانات پریمیوم، امروز",
      "فقط صورتحساب سه‌ماهه — بدون ماهانه یا سالانه",
      "فهرست کامل امکانات اختصاصی پلاتینیوم به‌زودی نهایی می‌شود",
    ],
  },
};

/** Sales order: cheapest confirmed tier to the scarce one. */
export const PAID_PLANS: PlanId[] = ["pro", "featured", "platinum"];

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

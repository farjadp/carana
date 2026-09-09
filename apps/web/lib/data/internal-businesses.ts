// ============================================================================
// Source: apps/web/lib/data/internal-businesses.ts
// Version: 1.0.0 — 2026-09-09
// Why: Five of the listings in the directory belong to the people who run it.
//      On 9 Sep 2026 the home page's two most prominent promotional slots held
//      three of them: «ویژه» showed ویزا رودز and آشاوید, and «پربازدیدترین»
//      showed آشاوید (۴۶), فرجاد پورمحمد (۲۰) and ویزا رودز (۱۹) — so of the
//      eight businesses a visitor met above the fold, three were the founder's.
//      Nothing on the page was false; the «ویژه» chip says the slot was paid
//      for. It still reads as a directory that mostly lists itself.
//
//      So: internal listings are excluded from the PROMOTIONAL slots only —
//      the home page's featured band and its most-visited rail. They stay
//      fully listed everywhere a visitor is actually looking for them: search,
//      category pages, city pages, the sitemap, their own profile. Hiding a
//      real business from search to look modest would be the same dishonesty
//      pointing the other way.
// Env / Identity: Pure data. No IO.
// ============================================================================

/**
 * Slugs of businesses owned by GOPLAZA / Ashavid Inc. and its founder.
 * Keep in sync by hand — there is no DB flag for this, and adding one would
 * put a "hide me from the home page" switch in the admin UI, which is not a
 * knob anyone should have.
 */
export const INTERNAL_BUSINESS_SLUGS: readonly string[] = [
  "ashavid",
  "visa-roads",
  "farjad-pourmohammad",
  "verixa",
  "contivo",
];

const SET = new Set(INTERNAL_BUSINESS_SLUGS);

/** True when a row is one of ours and must not take a promotional slot. */
export function isInternalBusiness(row: { slug?: string | null } | null | undefined): boolean {
  const slug = row?.slug?.trim().toLowerCase();
  return !!slug && SET.has(slug);
}

/** Drop internal listings from a promotional list. Order is preserved. */
export function withoutInternal<T extends { slug?: string | null }>(rows: readonly T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isInternalBusiness(r));
}

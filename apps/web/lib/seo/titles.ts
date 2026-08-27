// ============================================================================
// Source: lib/seo/titles.ts
// Version: 1.0.0 — 2026-08-24
// Why: One place that builds every <title> and meta description, per page
//      type, from the formulas in docs/12-seo-architecture.md §6.
//
//      The listing title used to be `${name} (${city})` — "داروخانه پراسپکت
//      (Newmarket) | GOPLAZA". Neither the category word nor «ایرانی» appeared
//      anywhere, and the city was in Latin while the query is Persian. The
//      words a searcher actually types — «داروخانه ایرانی نیومارکت» — were
//      absent from the one field that matters most for both ranking and CTR.
//
//      Since the URL policy keeps slugs in English (§13.3), the title, H1 and
//      body are the ONLY places the Persian query can be matched. That makes
//      this file the load-bearing part of the Persian-query strategy.
//
// Env / Identity: Pure functions. No I/O, no secrets.
// ============================================================================
import { brand } from "@goplaza/core";

/**
 * The word a person types, which is not the category's display name.
 * Nobody searches «پزشکی، دندانپزشکی و سلامت»; they search «پزشک ایرانی».
 * Display names stay as they are — this is strictly for query matching.
 *
 * The term also lands in the listing's own <title>, so it has to be true of
 * EVERY listing in the category, not just the typical one. `iranian-grocery`
 * failed that test until 24 Aug 2026: it said «سوپرمارکت», while only 88 of
 * 255 sampled listings in it are actually grocers — the rest are jewellers,
 * florists, homeware shops, dried-fruit sellers and confectioners, all of
 * whom had a Google title reading «سوپرمارکت ایرانی در …». «فروشگاه» is the
 * category's own name («فروشگاه ایرانی»), is a real query, and is true of the
 * whole set. Narrowing a term to the majority is how a title starts lying
 * about the minority.
 */
const CATEGORY_SEARCH_TERM: Record<string, string> = {
  "restaurant-cafe": "رستوران",
  "medical-clinic": "پزشک",
  "legal-immigration": "وکیل",
  "real-estate-mortgage": "مشاور املاک",
  "accounting-tax": "حسابدار",
  "beauty-wellness": "آرایشگاه",
  "iranian-grocery": "فروشگاه",
  education: "آموزشگاه",
  "skilled-trades": "خدمات فنی",
  automotive: "خدمات خودرو",
  "digital-it": "خدمات کامپیوتر",
  events: "خدمات مجالس",
};

export function categorySearchTerm(slug: string | null | undefined, fallback?: string | null): string | null {
  if (!slug) return fallback?.trim() || null;
  return CATEGORY_SEARCH_TERM[slug] ?? fallback?.trim() ?? null;
}

/** Latin → Persian digits, for display strings only. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/**
 * Google truncates the displayed title around 60 characters. Rather than let
 * it cut mid-word, drop whole optional segments in a fixed order.
 * The business name and the city are never dropped — they are the two things
 * that make the result identifiable.
 */
const TITLE_LIMIT = 60;

export function fitTitle(parts: {
  /** Never dropped. */
  core: string;
  /** Dropped last. */
  city?: string | null;
  /** Dropped third. */
  qualifier?: string | null;
  /** Dropped second. */
  detail?: string | null;
  /** Dropped first. */
  suffix?: string | null;
}): string {
  const { core, city, qualifier, detail, suffix } = parts;
  const build = (opts: { qualifier: boolean; detail: boolean; suffix: boolean }) => {
    let head = core;
    if (qualifier && opts.qualifier) head = `${head} ${qualifier}`;
    if (city) head = `${head} در ${city}`;
    const tail: string[] = [];
    if (detail && opts.detail) tail.push(detail);
    if (suffix && opts.suffix) tail.push(suffix);
    return tail.length ? `${head} | ${tail.join(" | ")}` : head;
  };

  for (const opts of [
    { qualifier: true, detail: true, suffix: true },
    { qualifier: true, detail: true, suffix: false },
    { qualifier: true, detail: false, suffix: false },
    { qualifier: false, detail: false, suffix: false },
  ]) {
    const candidate = build(opts);
    if (candidate.length <= TITLE_LIMIT) return candidate;
  }
  // Everything optional is gone and it is still long — a 60-character business
  // name (27 rows have one). Return it whole rather than cutting mid-word.
  return build({ qualifier: false, detail: false, suffix: false });
}

// ---------------------------------------------------------------------------
// Per page type
// ---------------------------------------------------------------------------

/**
 * `{name} — {category} ایرانی در {city} | آدرس و تلفن | پلازا`
 * The em-dash matters: 9 imported rows have a Latin name run straight into a
 * Persian one with no separator, and a bare space would hide that.
 */
export function businessTitle(input: {
  name: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  cityFa?: string | null;
}): string {
  const term = categorySearchTerm(input.categorySlug, input.categoryName);
  const core = term ? `${input.name.trim()} — ${term}` : input.name.trim();
  return fitTitle({
    core,
    qualifier: term ? "ایرانی" : null,
    city: input.cityFa?.trim() || null,
    detail: "آدرس و تلفن",
    suffix: brand.nameFa,
  });
}

export function businessDescription(input: {
  name: string;
  categorySlug?: string | null;
  categoryName?: string | null;
  cityFa?: string | null;
  shortDescription?: string | null;
  hasPhone?: boolean;
  hasAddress?: boolean;
}): string {
  const own = input.shortDescription?.trim();
  if (own && own.length >= 60) return own.slice(0, 300);

  const term = categorySearchTerm(input.categorySlug, input.categoryName);
  const where = input.cityFa?.trim();
  const lead = [input.name.trim(), term ? `${term} ایرانی` : null, where ? `در ${where}` : null]
    .filter(Boolean)
    .join(" — ");

  // Only claim what the row actually carries: 47.6 % have an address and
  // 97.4 % a phone, so neither can be asserted unconditionally.
  const have = [input.hasPhone ? "شماره تماس" : null, input.hasAddress ? "آدرس" : null].filter(Boolean);
  const detail = have.length ? `${have.join(" و ")} و راه‌های ارتباطی.` : "اطلاعات تماس و معرفی.";
  return `${lead}. ${detail} در دایرکتوری کسب‌وکارهای ایرانیان کانادا، رایگان و بدون ثبت‌نام.`;
}

/** `{category} ایرانی در {city} | فهرست {N} کسب‌وکار با آدرس و تلفن` */
export function cityCategoryTitle(input: { categorySlug: string; categoryName: string; cityFa: string; count: number }): string {
  const term = categorySearchTerm(input.categorySlug, input.categoryName) ?? input.categoryName;
  return fitTitle({
    core: term,
    qualifier: "ایرانی",
    city: input.cityFa,
    detail: `${toPersianDigits(input.count)} کسب‌وکار با آدرس و تلفن`,
    suffix: brand.nameFa,
  });
}

export function cityCategoryDescription(input: {
  categorySlug: string;
  categoryName: string;
  cityFa: string;
  count: number;
  withPhone: number;
  withWebsite: number;
}): string {
  const term = categorySearchTerm(input.categorySlug, input.categoryName) ?? input.categoryName;
  const n = toPersianDigits(input.count);
  const extras: string[] = [];
  if (input.withPhone > 0) extras.push(`${toPersianDigits(input.withPhone)} مورد شماره تماس`);
  if (input.withWebsite > 0) extras.push(`${toPersianDigits(input.withWebsite)} مورد وب‌سایت`);
  const tail = extras.length ? ` ${extras.join(" و ")} دارند.` : "";
  return `${term} ایرانی در ${input.cityFa}؟ فهرست ${n} کسب‌وکار با آدرس، تلفن و راه ارتباطی.${tail} رایگان و بدون ثبت‌نام.`;
}

/** `مشاغل ایرانی {city} | راهنمای {N} کسب‌وکار` */
export function cityTitle(input: { cityFa: string; count: number }): string {
  return fitTitle({
    core: "مشاغل ایرانی",
    city: input.cityFa,
    detail: `راهنمای ${toPersianDigits(input.count)} کسب‌وکار`,
    suffix: brand.nameFa,
  });
}

/** `{category} ایرانی در کانادا | {N} کسب‌وکار در {M} شهر` */
export function categoryTitle(input: { categorySlug: string; categoryName: string; count: number; cityCount: number }): string {
  const term = categorySearchTerm(input.categorySlug, input.categoryName) ?? input.categoryName;
  return fitTitle({
    core: term,
    qualifier: "ایرانی",
    city: "کانادا",
    detail: `${toPersianDigits(input.count)} کسب‌وکار در ${toPersianDigits(input.cityCount)} شهر`,
    suffix: brand.nameFa,
  });
}

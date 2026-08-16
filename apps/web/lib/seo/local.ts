// ============================================================================
// Source: lib/seo/local.ts
// Version: 1.0.0 — 2026-08-15
// Why: One place for the city × category "programmatic" pages and the
//      structured data that goes with them. Everything here is computed from
//      the live directory — counts, verified counts, open-now — so a page
//      never asserts more than the database can back. Pages with fewer than
//      MIN_INDEXABLE listings still render (with a "be the first" CTA) but
//      carry noindex, so thin combos never reach the index.
// Env / Identity: Server only. Anon client; explicit public columns.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import { PUBLIC_STATUSES } from "@charana/core";
import { citySlug, cityConfigs, dynamicCityConfig, findCityConfig, type CityConfig } from "@/lib/data/cities";
import { resolveProvince } from "@charana/core";
import { sortFeaturedFirst } from "@/lib/billing/entitlements";
import { getCategoryDetail } from "@/lib/data/category-details";
import { env } from "@/lib/env";
import { getVerificationStatus, isTrusted, type VerificationMethod } from "@/lib/verification/status";

export const MIN_INDEXABLE = 3;

/** Columns a public list page is allowed to read. Never `*`. */
export const LOCAL_CARD_COLUMNS =
  "id, slug, name, name_en, category, sub_category, tagline, short_description, city, province, phone, website, logo_url, cover_url, working_hours, view_count, verified_at, verified_until, verified_phone, verified_email, verification_method, plan, plan_until, busy_status, busy_status_until";

/**
 * `businesses.category` is free text (see Notion "businesses.category is not
 * a foreign key"). Until that lands, these are the spellings that mean the
 * same category. Moved here from the category page so every list agrees.
 */
export function getCategoryAliases(slug: string, name?: string): string[] {
  const aliases = new Set<string>([slug]);
  if (name) aliases.add(name);
  const add = (...xs: string[]) => xs.forEach((x) => aliases.add(x));
  if (slug === "medical-clinic" || slug === "medical") add("medical", "medical-clinic", "پزشکی، دندانپزشکی و سلامت", "پزشکی");
  else if (slug === "restaurant-cafe" || slug === "food") add("food", "restaurant-cafe", "رستوران، کافه و غذا", "رستوران");
  else if (slug === "legal-immigration" || slug === "legal") add("legal", "legal-immigration", "حقوقی و وکالت");
  else if (slug === "real-estate-mortgage" || slug === "real_estate") add("real_estate", "real-estate-mortgage", "مشاور املاک", "املاک و وام");
  else if (slug === "accounting-tax" || slug === "financial") add("financial", "accounting-tax", "مالی، حسابداری و بیمه");
  else if (slug === "beauty-wellness" || slug === "beauty") add("beauty", "beauty-wellness", "آرایشگری و زیبایی");
  else if (slug === "iranian-grocery" || slug === "retail") add("retail", "iranian-grocery", "فروشگاه و خرده‌فروشی");
  else if (slug === "skilled-trades" || slug === "construction") add("construction", "skilled-trades", "ساختمان و تاسیسات");
  return [...aliases];
}

/**
 * Resolve a URL segment to a city: a curated config (toronto…) or, failing
 * that, any city name present in the data ("richmond-hill" → Richmond Hill),
 * with its Persian name from `city_aliases`. Null when nothing matches.
 */
export async function resolveCity(supabase: SupabaseClient, segment: string): Promise<CityConfig | null> {
  const cfg = findCityConfig(segment);
  if (cfg) return cfg;
  const key = decodeURIComponent(segment).trim().toLowerCase();
  const { data } = await supabase
    .from("businesses")
    .select("city, province")
    .in("status", PUBLIC_STATUSES)
    .not("city", "is", null);
  const rows = (data ?? []) as { city: string; province: string | null }[];
  const hit = rows.find((r) => citySlug(r.city) === key || r.city.toLowerCase() === key);
  if (!hit) return null;
  const nameEn = hit.city.trim();
  const provinceRow = rows.filter((r) => r.city === hit.city).map((r) => r.province).find(Boolean) ?? null;
  const province = resolveProvince(provinceRow);
  const { data: alias } = await supabase.from("city_aliases").select("aliases").ilike("city_en", nameEn).maybeSingle();
  // Aliases are space-separated; a two-word English name gets its first two tokens.
  const words = nameEn.split(/\s+/).length;
  const nameFa = alias?.aliases ? String(alias.aliases).split(/\s+/).slice(0, words).join(" ") : null;
  return dynamicCityConfig(nameEn, { nameFa, province: province?.code ?? provinceRow, provinceFa: province?.name ?? null });
}

/** PostgREST `or=` filter matching a city config's name and neighbourhoods. */
export function cityFilterOr(city: CityConfig): string {
  const terms = [city.nameEn, ...(city.nameFa !== city.nameEn ? [city.nameFa] : []), ...city.neighborhoods];
  // ilike patterns; commas would break the or() grammar, none of ours have any.
  return terms.map((t) => `city.ilike.%${t.replace(/[,()]/g, "")}%`).join(",");
}

export type LocalBusiness = {
  id: string;
  slug: string | null;
  name: string;
  name_en: string | null;
  category: string | null;
  sub_category: string | null;
  tagline: string | null;
  short_description: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  working_hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  view_count: number | null;
  verified_at: string | null;
  verified_until: string | null;
  verified_phone: string | null;
  verified_email: string | null;
  verification_method: VerificationMethod | null;
  plan: string | null;
  plan_until: string | null;
  busy_status: string | null;
  busy_status_until: string | null;
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** True only when today's hours exist and the clock is inside them. */
export function isOpenNow(hours: LocalBusiness["working_hours"], now = new Date()): boolean {
  if (!hours) return false;
  const h = hours[DAY_KEYS[now.getDay()]];
  if (!h || h.closed || !h.open || !h.close) return false;
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  if ([oh, om, ch, cm].some(Number.isNaN)) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return m >= oh * 60 + om && m < ch * 60 + cm;
}

export type LocalStats = {
  total: number;
  verified: number;
  openNow: number;
  withHours: number;
  withWebsite: number;
  subCategories: { name: string; count: number }[];
};

export function summarise(rows: LocalBusiness[]): LocalStats {
  const subs = new Map<string, number>();
  let verified = 0, openNow = 0, withHours = 0, withWebsite = 0;
  for (const b of rows) {
    if (isTrusted(getVerificationStatus(b))) verified++;
    if (b.working_hours && Object.keys(b.working_hours).length) {
      withHours++;
      if (isOpenNow(b.working_hours)) openNow++;
    }
    if (b.website) withWebsite++;
    if (b.sub_category) subs.set(b.sub_category, (subs.get(b.sub_category) ?? 0) + 1);
  }
  return {
    total: rows.length,
    verified,
    openNow,
    withHours,
    withWebsite,
    subCategories: [...subs.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
  };
}

/** All public rows for one city × category. Sorted featured-first (labelled — see
 *  sortFeaturedFirst), then verified-first, then newest. */
export async function fetchLocalBusinesses(
  supabase: SupabaseClient,
  city: CityConfig,
  categorySlug: string,
  categoryName?: string
): Promise<LocalBusiness[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select(LOCAL_CARD_COLUMNS)
    .in("status", PUBLIC_STATUSES)
    .in("category", getCategoryAliases(categorySlug, categoryName))
    .or(cityFilterOr(city))
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as unknown as LocalBusiness[];
  const verifiedFirst = rows.sort(
    (a, b) => Number(isTrusted(getVerificationStatus(b))) - Number(isTrusted(getVerificationStatus(a)))
  );
  return sortFeaturedFirst(verifiedFirst).map((x) => x.row);
}

/**
 * Category counts for one city — powers the chips on the city page and the
 * "other categories here" block. One query, rolled up in memory.
 */
export async function countCityCategories(
  supabase: SupabaseClient,
  city: CityConfig,
  categories: { slug: string; name: string }[]
): Promise<{ slug: string; name: string; count: number }[]> {
  const { data } = await supabase
    .from("businesses")
    .select("category")
    .in("status", PUBLIC_STATUSES)
    .or(cityFilterOr(city));
  const freq = new Map<string, number>();
  for (const r of (data ?? []) as { category: string | null }[]) if (r.category) freq.set(r.category, (freq.get(r.category) ?? 0) + 1);
  return categories
    .map((c) => ({ ...c, count: getCategoryAliases(c.slug, c.name).reduce((n, a) => n + (freq.get(a) ?? 0), 0) }))
    .sort((a, b) => b.count - a.count);
}

/** Same category across cities — the "also in" block and the sitemap. */
export async function countCategoryCities(
  supabase: SupabaseClient,
  categorySlug: string,
  categoryName?: string
): Promise<{ city: CityConfig; count: number }[]> {
  const { data } = await supabase
    .from("businesses")
    .select("city")
    .in("status", PUBLIC_STATUSES)
    .in("category", getCategoryAliases(categorySlug, categoryName));
  const cities = ((data ?? []) as { city: string | null }[]).map((r) => (r.city ?? "").toLowerCase());
  return cityConfigs
    .map((city) => {
      const terms = [city.nameEn, city.nameFa, ...city.neighborhoods].map((t) => t.toLowerCase());
      return { city, count: cities.filter((c) => terms.some((t) => c.includes(t))).length };
    })
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------
export const SITE = env.baseUrl.replace(/\/$/, "");

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE}${it.url}` })),
  };
}

export function itemListLd(name: string, url: string, rows: LocalBusiness[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: `${SITE}${url}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 50).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/businesses/${b.slug ?? b.id}`,
      name: b.name,
    })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function localBusinessLd(b: LocalBusiness & { address?: string | null; is_address_public?: boolean | null; description?: string | null }, categoryName?: string | null) {
  const hours = b.working_hours
    ? Object.entries(b.working_hours)
        .filter(([, h]) => h && !h.closed && h.open && h.close)
        .map(([day, h]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
          opens: h.open,
          closes: h.close,
        }))
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE}/businesses/${b.slug ?? b.id}`,
    url: `${SITE}/businesses/${b.slug ?? b.id}`,
    name: b.name,
    alternateName: b.name_en ?? undefined,
    description: b.short_description ?? b.tagline ?? b.description ?? undefined,
    image: b.cover_url ?? b.logo_url ?? undefined,
    telephone: b.phone ?? undefined,
    sameAs: b.website ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.is_address_public && b.address ? b.address : undefined,
      addressLocality: b.city ?? undefined,
      addressRegion: b.province ?? undefined,
      addressCountry: "CA",
    },
    openingHoursSpecification: hours && hours.length ? hours : undefined,
    additionalType: categoryName ?? undefined,
    // Data provenance for AI readers: what "verified" means here.
    ...(isTrusted(getVerificationStatus(b))
      ? { identifier: { "@type": "PropertyValue", name: "charana:verified", value: "phone-or-email-proven" } }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Copy — one honest paragraph and FAQ per combo, from the numbers.
// ---------------------------------------------------------------------------
const fa = (n: number) => n.toLocaleString("fa-IR");

export function localHeadline(cityFa: string, categoryName: string) {
  // "دندان‌پزشک ایرانی در تورنتو" reads better than "پزشکی، دندانپزشکی و سلامت ایرانی در تورنتو";
  // the detail configs carry long labels, so shorten a few known ones.
  const short: Record<string, string> = {
    "پزشکی، دندانپزشکی و سلامت": "پزشک و کلینیک",
    "رستوران، کافه و غذا": "رستوران و کافه",
    "مالی، حسابداری و بیمه": "حسابدار و مشاور مالی",
    "حقوقی و وکالت": "وکیل و مشاور مهاجرت",
    "آرایشگری و زیبایی": "سالن زیبایی",
    "فروشگاه و خرده‌فروشی": "فروشگاه",
    "ساختمان و تاسیسات": "خدمات فنی و ساختمانی",
  };
  return `${short[categoryName] ?? categoryName} ایرانی در ${cityFa}`;
}

export function localIntro(city: CityConfig, categoryName: string, s: LocalStats, updated: Date) {
  const cat = localHeadline(city.nameFa, categoryName).replace(` در ${city.nameFa}`, "");
  if (s.total === 0) {
    return `هنوز ${cat} در ${city.nameFa} در چارانا ثبت نشده است. اگر خودتان این کسب‌وکار را دارید یا کسی را می‌شناسید، ثبت رایگان است و همین صفحه با اولین ثبت زنده می‌شود.`;
  }
  const parts = [`${fa(s.total)} ${cat} در ${city.nameFa} و اطراف آن در چارانا ثبت شده‌اند`];
  if (s.verified) parts.push(`${fa(s.verified)} مورد شماره یا ایمیل‌شان را اثبات کرده‌اند و نشان تأیید دارند`);
  if (s.withHours) parts.push(`${fa(s.withHours)} مورد ساعت کاری‌شان را اعلام کرده‌اند`);
  return `${parts.join("؛ ")}. این عددها از پایگاه داده‌ی چارانا می‌آیند و آخرین بار ${updated.toLocaleDateString("fa-IR", { dateStyle: "long" })} به‌روز شده‌اند.`;
}

export function localFaqs(city: CityConfig, categoryName: string, s: LocalStats) {
  const cat = localHeadline(city.nameFa, categoryName).replace(` در ${city.nameFa}`, "");
  const faqs: { q: string; a: string }[] = [
    {
      q: `چند ${cat} در ${city.nameFa} هست؟`,
      a: s.total
        ? `در حال حاضر ${fa(s.total)} ${cat} در ${city.nameFa} و محله‌های اطراف (${city.neighborhoods.slice(0, 5).join("، ")}) در چارانا فهرست شده‌اند. عدد زنده است و با هر ثبت جدید تغییر می‌کند.`
        : `هنوز موردی ثبت نشده است. چارانا دایرکتوری زنده است؛ اولین ثبت همین‌جا ظاهر می‌شود.`,
    },
    {
      q: `«تأییدشده» در چارانا یعنی چه؟`,
      a: `یعنی صاحب کسب‌وکار با کد پیامکی یا ایمیل ثابت کرده که شماره یا ایمیل منتشرشده مال خودش است. نشان شش ماه اعتبار دارد و اگر شماره عوض شود خودبه‌خود برداشته می‌شود. ${s.verified ? `در این صفحه ${fa(s.verified)} مورد تأییدشده‌اند.` : "در این صفحه هنوز موردی تأیید نشده است."}`,
    },
    {
      q: `چطور ${cat} ایرانی نزدیک خودم پیدا کنم؟`,
      a: `از جستجوی چارانا استفاده کن — فارسی یا انگلیسی، حتی با کیبورد اشتباه — یا از فهرست همین صفحه، که تأییدشده‌ها اول آمده‌اند. هر پروفایل شماره، مسیر، ساعت کاری و در صورت وجود لینک رزرو دارد.`,
    },
    {
      q: `خودم ${cat} در ${city.nameFa} دارم؛ چطور ثبت کنم؟`,
      a: `ثبت رایگان است: «ثبت کسب‌وکار» را بزن، یا آدرس وب‌سایتت را بده تا اطلاعات را خودمان بخوانیم. بعد از تأیید شماره، نشان «تأییدشده» می‌گیری.`,
    },
  ];
  return faqs;
}

export function localCategoryName(slug: string) {
  return getCategoryDetail(slug).name;
}

// ============================================================================
// Source: lib/data/cities.ts
// Version: 1.0.0 — 2026-08-12
// Why: Keep supported city landing-page metadata in one reusable place.
// Env / Identity: Static city content, no runtime secrets.
// ============================================================================
export type CityConfig = {
  slug: string;
  nameEn: string;
  nameFa: string;
  province: string;
  provinceFa: string;
  headline: string;
  description: string;
  neighborhoods: string[];
  priorityCategories: string[];
};

export const cityConfigs = [
  {
    slug: "toronto",
    nameEn: "Toronto",
    nameFa: "تورنتو",
    province: "ON",
    provinceFa: "انتاریو",
    headline: "کسب‌وکارهای ایرانی در تورنتو",
    description:
      "تورنتو یکی از اصلی‌ترین مراکز جامعه ایرانیان کاناداست؛ از نورث‌یورک و ریچموندهیل تا داون‌تاون، این صفحه برای پیدا کردن خدمات، فروشگاه‌ها و متخصصان ایرانی همین منطقه طراحی شده است.",
    neighborhoods: ["North York", "Richmond Hill", "Thornhill", "Markham", "Vaughan", "Newmarket", "Aurora", "Mississauga", "Downtown Toronto"],
    priorityCategories: ["رستوران و کافه", "پزشک و کلینیک", "وکیل و مهاجرت", "املاک و وام", "زیبایی و سلامت", "فروشگاه ایرانی"],
  },
  {
    slug: "vancouver",
    nameEn: "Vancouver",
    nameFa: "ونکوور",
    province: "BC",
    provinceFa: "بریتیش کلمبیا",
    headline: "کسب‌وکارهای ایرانی در ونکوور",
    description:
      "مسیر جستجوی کسب‌وکارهای ایرانی در ونکوور و شهرهای اطراف، از خدمات محلی تا متخصصان فارسی‌زبان.",
    neighborhoods: ["North Vancouver", "West Vancouver", "Burnaby", "Coquitlam", "Richmond", "Downtown Vancouver"],
    priorityCategories: ["رستوران و کافه", "املاک و وام", "خدمات درمانی", "آموزش", "خدمات فنی"],
  },
  {
    slug: "montreal",
    nameEn: "Montreal",
    nameFa: "مونترال",
    province: "QC",
    provinceFa: "کبک",
    headline: "کسب‌وکارهای ایرانی در مونترال",
    description:
      "دایرکتوری کسب‌وکارها و متخصصان ایرانی در مونترال، با توجه به نیازهای فارسی‌زبانان در فضای دو زبانه کبک.",
    neighborhoods: ["Downtown Montreal", "Cote-des-Neiges", "Laval", "West Island", "Brossard"],
    priorityCategories: ["رستوران و کافه", "حقوقی و مهاجرت", "آموزش", "فروشگاه ایرانی", "زیبایی و سلامت"],
  },
  {
    slug: "calgary",
    nameEn: "Calgary",
    nameFa: "کلگری",
    province: "AB",
    provinceFa: "آلبرتا",
    headline: "کسب‌وکارهای ایرانی در کلگری",
    description:
      "صفحه شهری کلگری برای معرفی کسب‌وکارهای ایرانی، خدمات حرفه‌ای و نیازهای روزمره جامعه فارسی‌زبان آلبرتا.",
    neighborhoods: ["Downtown Calgary", "NW Calgary", "SW Calgary", "NE Calgary", "SE Calgary"],
    priorityCategories: ["خدمات فنی", "املاک و وام", "رستوران و کافه", "حسابداری و مالیات", "فروشگاه ایرانی"],
  },
  {
    slug: "ottawa",
    nameEn: "Ottawa",
    nameFa: "اتاوا",
    province: "ON",
    provinceFa: "انتاریو",
    headline: "کسب‌وکارهای ایرانی در اتاوا",
    description:
      "مسیر پیدا کردن خدمات و کسب‌وکارهای ایرانی در اتاوا و محدوده پایتخت کانادا.",
    neighborhoods: ["Centretown", "Nepean", "Kanata", "Orleans", "Gatineau"],
    priorityCategories: ["حقوقی و مهاجرت", "آموزش", "خدمات درمانی", "رستوران و کافه"],
  },
  {
    slug: "edmonton",
    nameEn: "Edmonton",
    nameFa: "ادمونتون",
    province: "AB",
    provinceFa: "آلبرتا",
    headline: "کسب‌وکارهای ایرانی در ادمونتون",
    description:
      "دایرکتوری کسب‌وکارهای ایرانی در ادمونتون برای پیدا کردن خدمات محلی، متخصصان و فروشگاه‌های فارسی‌زبان.",
    neighborhoods: ["Downtown Edmonton", "South Edmonton", "West Edmonton", "North Edmonton", "St. Albert"],
    priorityCategories: ["خدمات فنی", "رستوران و کافه", "حسابداری و مالیات", "زیبایی و سلامت"],
  },
  {
    slug: "winnipeg",
    nameEn: "Winnipeg",
    nameFa: "وینیپگ",
    province: "MB",
    provinceFa: "منیتوبا",
    headline: "کسب‌وکارهای ایرانی در وینیپگ",
    description:
      "صفحه شهری وینیپگ برای دیده شدن و پیدا شدن کسب‌وکارهای ایرانی در منیتوبا.",
    neighborhoods: ["Downtown Winnipeg", "Fort Garry", "St. Vital", "Transcona", "River Heights"],
    priorityCategories: ["رستوران و کافه", "خدمات فنی", "آموزش", "فروشگاه ایرانی"],
  },
  {
    slug: "halifax",
    nameEn: "Halifax",
    nameFa: "هلیفکس",
    province: "NS",
    provinceFa: "نوا اسکوشیا",
    headline: "کسب‌وکارهای ایرانی در هلیفکس",
    description:
      "دایرکتوری اولیه کسب‌وکارهای ایرانی در هلیفکس برای کمک به جامعه فارسی‌زبان نوا اسکوشیا.",
    neighborhoods: ["Downtown Halifax", "Dartmouth", "Bedford", "Clayton Park", "Sackville"],
    priorityCategories: ["آموزش", "رستوران و کافه", "خدمات درمانی", "خدمات فنی"],
  },
] satisfies CityConfig[];

export function getCityConfig(slug: string) {
  return cityConfigs.find((city) => city.slug === slug);
}

/** URL slug for any city name: "Richmond Hill" → "richmond-hill". */
export function citySlug(nameEn: string) {
  return nameEn
    .trim()
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Case-insensitive lookup by slug OR English name, so `/cities/Toronto`
 * (as the index used to link) and `/cities/toronto` both resolve.
 */
export function findCityConfig(slugOrName: string) {
  const key = decodeURIComponent(slugOrName).trim().toLowerCase();
  return cityConfigs.find(
    (c) => c.slug === key || c.nameEn.toLowerCase() === key || citySlug(c.nameEn) === key || c.nameFa === key
  );
}

/**
 * Build a config for a city that only exists in the data (Markham,
 * Newmarket…). Persian name comes from `city_aliases` when known.
 */
export function dynamicCityConfig(nameEn: string, opts: { nameFa?: string | null; province?: string | null; provinceFa?: string | null }): CityConfig {
  const fa = opts.nameFa?.trim() || nameEn;
  return {
    slug: citySlug(nameEn),
    nameEn,
    nameFa: fa,
    province: opts.province ?? "",
    provinceFa: opts.provinceFa ?? "",
    headline: `کسب‌وکارهای ایرانی در ${fa}`,
    description: `فهرست زنده‌ی کسب‌وکارهای ایرانی ${fa}${opts.provinceFa ? ` در ${opts.provinceFa}` : ""} — شماره، ساعت کاری، مسیر و نشان تأیید، از پایگاه داده‌ی گوپلازا.`,
    neighborhoods: [],
    priorityCategories: [],
  };
}

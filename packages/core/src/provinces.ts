// ============================================================================
// Source: packages/core/src/provinces.ts
// Version: 1.0.0 — 2026-08-23
// Why: The directory browses province → city. Province slugs and Persian names
//      have to be identical on web and mobile, so they live here.
// Env / Identity: Pure data.
// ============================================================================

export type Province = {
  slug: string;
  name: string;
  nameEn: string;
  /** Two-letter code, used in addresses and map links. */
  code: string;
};

export const PROVINCES: Province[] = [
  { slug: "ontario", name: "انتاریو", nameEn: "Ontario", code: "ON" },
  { slug: "british-columbia", name: "بریتیش کلمبیا", nameEn: "British Columbia", code: "BC" },
  { slug: "quebec", name: "کبک", nameEn: "Quebec", code: "QC" },
  { slug: "alberta", name: "آلبرتا", nameEn: "Alberta", code: "AB" },
  { slug: "manitoba", name: "مانیتوبا", nameEn: "Manitoba", code: "MB" },
  { slug: "saskatchewan", name: "ساسکاچوان", nameEn: "Saskatchewan", code: "SK" },
  { slug: "nova-scotia", name: "نوا اسکوشیا", nameEn: "Nova Scotia", code: "NS" },
  { slug: "new-brunswick", name: "نیوبرانزویک", nameEn: "New Brunswick", code: "NB" },
  {
    slug: "newfoundland-and-labrador",
    name: "نیوفاندلند و لابرادور",
    nameEn: "Newfoundland and Labrador",
    code: "NL",
  },
  { slug: "prince-edward-island", name: "جزیره پرنس ادوارد", nameEn: "Prince Edward Island", code: "PE" },
];

const BY_SLUG = new Map(PROVINCES.map((p) => [p.slug, p]));
const BY_NAME_EN = new Map(PROVINCES.map((p) => [p.nameEn.toLowerCase(), p]));
const BY_CODE = new Map(PROVINCES.map((p) => [p.code.toLowerCase(), p]));

export function getProvinceBySlug(slug: string): Province | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Resolve whatever is stored in `businesses.province` to a known province.
 * Rows are normalised on import, but hand-entered values still arrive as codes.
 */
export function resolveProvince(value: string | null | undefined): Province | null {
  if (!value) return null;

  const key = value.trim().toLowerCase();
  return BY_NAME_EN.get(key) ?? BY_CODE.get(key) ?? null;
}

export function provinceSlug(value: string | null | undefined): string | null {
  return resolveProvince(value)?.slug ?? null;
}

export function provinceLabel(value: string | null | undefined): string | null {
  return resolveProvince(value)?.name ?? value ?? null;
}

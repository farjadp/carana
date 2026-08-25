// ============================================================================
// Source: lib/data/category-aliases.ts
// Version: 1.0.0 — 2026-08-24
// Why: Category spelling variants, extracted from lib/seo/local.ts so that
//      lib/seo/geo-index.ts can roll categories up without importing local.ts
//      — local.ts imports geo-index.ts, and the pair formed an ESM cycle.
// Env / Identity: Pure data, no runtime secrets.
// ============================================================================
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

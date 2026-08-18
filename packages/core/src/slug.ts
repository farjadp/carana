// ============================================================================
// Source: packages/core/src/slug.ts
// Version: 1.0.0 — 2026-08-13
// Why: Utility functions for string manipulation.
// ============================================================================

/**
 * Converts a string (including Persian/Arabic) to a URL-friendly slug.
 */
export function slugify(text: string): string {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-\u0600-\u06FF]+/g, "") // Remove all non-word chars except Persian/Arabic
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

// ---------------------------------------------------------------------------
// Latin slugs
//
// Moved here from scripts/import-listings.mts on 2026-08-18, because the jobs
// board needs the same transliteration at runtime and the standing URL rule
// says every new URL is English. Two copies of a slug function is two ways to
// build the same URL, which is how a link ends up 404ing.
// ---------------------------------------------------------------------------

/**
 * Fold the Persian variants that are the same letter to a reader but different
 * code points to a computer, so matching and transliteration are stable.
 * Never write the result back to the database — it is for comparison only.
 */
export function foldPersian(s: string): string {
  return s
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, " ")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[ً-ٟ]/g, ""); // harakat
}

/** Deterministic Persian → Latin letter map. Good enough for a URL, not for prose. */
const TRANSLIT: Record<string, string> = {
  ا:"a",آ:"a",ب:"b",پ:"p",ت:"t",ث:"s",ج:"j",چ:"ch",ح:"h",خ:"kh",د:"d",ذ:"z",ر:"r",ز:"z",ژ:"zh",س:"s",ش:"sh",
  ص:"s",ض:"z",ط:"t",ظ:"z",ع:"a",غ:"gh",ف:"f",ق:"gh",ک:"k",گ:"g",ل:"l",م:"m",ن:"n",و:"v",ه:"h",ی:"y",ء:"",ئ:"y",ؤ:"o",
};

/**
 * A URL-safe ASCII slug, transliterating Persian rather than dropping it.
 *
 * `slugify()` above keeps Persian characters and is still used by older rows;
 * this one is what new URLs must use. Returns "" when nothing survives — the
 * caller decides the fallback, because a silent "business" default in here
 * would collide across unrelated rows.
 */
export function latinSlug(s: string, maxLength = 60): string {
  const t = foldPersian((s ?? "").toLowerCase()).split("").map((c) => TRANSLIT[c] ?? c).join("");
  return t
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

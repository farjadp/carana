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

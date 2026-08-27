// ============================================================================
// Source: packages/core/src/brand.ts
// Version: 1.0.0 — 2026-08-18
// Why: The single source of truth for brand-level constants after the
//      čārana → GOPLAZA rebrand. Web metadata, the mobile app, emails, SMS
//      bodies and JSON-LD all read from here so the next rename is one edit,
//      not four hundred.
// Env / Identity: Public constants only. The canonical origin at runtime is
//      still NEXT_PUBLIC_BASE_URL / EXPO_PUBLIC_API_URL when set; `brand.url`
//      is the production default those fall back to.
// ============================================================================

export const brand = {
  /** Official display form. Always upper-case, never "GoPlaza" or "Go Plaza". */
  name: "GOPLAZA",
  /**
   * The form used inside Persian sentences ("… در پلازا ثبت شده است"),
   * where a Latin all-caps token would break the reading line. Decision D1
   * in REBRAND_PLAN.md — change here and it changes everywhere.
   */
  nameFa: "پلازا",
  /** Human-facing domain, as it is displayed. */
  domain: "GoPlaza.ca",
  /** Canonical production origin, no trailing slash. */
  url: "https://goplaza.ca",
  tagline: {
    en: "Discover. Connect. Grow.",
    fa: "کشف کن. وصل شو. رشد کن.",
  },
  /** One-line positioning used in metadata and llms.txt. */
  concept: {
    en: "A modern discovery platform connecting users with local businesses.",
    fa: "دایرکتوری فارسی‌زبان کسب‌وکارهای ایرانیان کانادا",
  },
  /**
   * Core palette from the GOPLAZA brand board (2026-08-18). Token names in
   * globals.css / theme.ts kept their Persian names (annabi, lajvard, …);
   * only the burgundy value changed (#800000 → #7A1831).
   */
  colors: {
    burgundy: "#7A1831",
    navy: "#14213D",
    cream: "#F6F1E8",
    persianBlue: "#0047AB",
    gold: "#C9A24B",
    charcoal: "#2B2D31",
  },
  /** Mobile URL scheme. The old scheme stays registered for installed builds. */
  scheme: "goplaza",
  legacyScheme: "charana",
  /**
   * The short domain, bought 24 Aug 2026. It is NOT a second site: `proxy.ts`
   * serves it from this same app — bio pages at `gplz.link/<handle>` and the
   * platform's own short links at `/b`, `/j`, `/a`. Written here rather than
   * typed by hand for the same reason the brand name is.
   */
  shortDomain: "gplz.link",
  shortUrl: "https://gplz.link",
} as const;

/** `https://goplaza.ca/foo` — joins without doubling slashes. */
export function brandUrl(path = ""): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return path ? `${brand.url}${p}` : brand.url;
}

// ============================================================================
// Source: apps/web/lib/data/company.ts
// Version: 1.0.0 — 2026-08-22
// Why: Single source of truth for the legal entity behind čārana. Legal pages,
//      the App Store listing and the footer must all state the same thing —
//      Apple checks that the seller identity matches the site.
// Env / Identity: Public information only.
// ============================================================================

export const company = {
  /** Legal name as registered, and as it will appear as App Store seller. */
  legalName: "Ashavid Inc.",
  /** Product/brand operated by the company. */
  brand: "čārana",
  brandFa: "چارانا",
  jurisdiction: "Ontario, Canada",

  /** Approved 2026-08-14 with the Hidden Č identity. */
  tagline: {
    en: "Find with confidence.",
    fa: "با اطمینان پیدا کن.",
  },
  address: "Toronto, Ontario, Canada",

  email: {
    general: "hello@charana.ca",
    support: "support@charana.ca",
    privacy: "privacy@charana.ca",
    partners: "partners@charana.ca",
  },

  social: {
    linkedin: "https://www.linkedin.com/company/ashavid/",
    instagram: "https://www.instagram.com/ashavidgroup/",
    youtube: "https://www.youtube.com/@ashavidgroup",
    x: "https://x.com/ashavidgroup",
    facebook: "https://www.facebook.com/ashavid",
  },

  parentSite: "https://www.ashavid.ca",

  /** Keep in step with the legal pages below whenever they are revised. */
  legalLastUpdated: "2026-08-22",
} as const;

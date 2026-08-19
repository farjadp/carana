// ============================================================================
// Source: apps/web/lib/data/company.ts
// Version: 2.0.0 — 2026-08-18 (rebrand: brand fields now come from @goplaza/core)
// Why: Single source of truth for the legal entity behind GOPLAZA. Legal pages,
//      the App Store listing and the footer must all state the same thing —
//      Apple checks that the seller identity matches the site.
// Env / Identity: Public information only.
// ============================================================================
import { brand } from "@goplaza/core";

export const company = {
  /** Legal name as registered, and as it will appear as App Store seller. */
  legalName: "Ashavid Inc.",
  /** Product/brand operated by the company — see packages/core/src/brand.ts. */
  brand: brand.name,
  brandFa: brand.nameFa,
  jurisdiction: "Ontario, Canada",

  tagline: brand.tagline,
  address: "Toronto, Ontario, Canada",

  /**
   * Mailboxes. Still on the old domain on purpose: goplaza.ca is not yet a
   * verified sending domain in Resend and no goplaza.ca mailboxes exist.
   * Flip these four lines (and EMAIL_FROM in Vercel) once
   * REBRAND_EXTERNAL_ACTIONS.md §Resend is done. Displaying an address that
   * does not receive mail would break the honesty rule.
   */
  email: {
    general: "hello@charana.ca",
    support: "support@charana.ca",
    privacy: "privacy@charana.ca",
    partners: "partners@charana.ca",
    noreply: "noreply@charana.ca",
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
  legalLastUpdated: "2026-08-18",
} as const;

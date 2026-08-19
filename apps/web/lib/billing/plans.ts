// ============================================================================
// Source: lib/billing/plans.ts
// Version: 3.0.0 — 2026-08-16
// Why: Re-export. The plan definitions moved to @goplaza/core so the mobile
//      app reads the same quantities the web page shows and the server
//      clamps against — same reason verification status and live status
//      live there. Imported from the package root, not a subpath:
//      Turbopack does not resolve subpath exports of a workspace package.
// ============================================================================
export {
  PLANS,
  PAID_PLANS,
  GALLERY_LIMITS,
  ANNOUNCEMENT_LIMITS,
  FEATURED_RANDOM_BOOST,
  PLATINUM_SEAT_CAP,
  INTERVAL_LABEL_FA,
  INTERVAL_MONTHS,
  intervalsFor,
  planOf,
  planHas,
  priceIdFor,
  formatCad,
  type Plan,
  type PlanId,
  type Feature,
  type BillingInterval,
} from "@goplaza/core";

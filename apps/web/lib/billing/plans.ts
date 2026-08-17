// ============================================================================
// Source: lib/billing/plans.ts
// Version: 3.0.0 — 2026-08-16
// Why: Re-export. The plan definitions moved to @charana/core so the mobile
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
  planOf,
  planHas,
  priceIdFor,
  formatCad,
  type Plan,
  type PlanId,
  type Feature,
  type BillingInterval,
} from "@charana/core";

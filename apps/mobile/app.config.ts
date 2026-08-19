// ============================================================================
// Source: apps/mobile/app.config.ts
// Version: 1.0.0 — 2026-08-23
// Why: app.json holds the static config; this layer strips entitlements that a
//      free Apple ID cannot sign, so the app can be installed on a real device
//      before the paid Developer account exists.
// Env / Identity: Reads APPLE_TEAM_ID only to decide which entitlements apply.
// ============================================================================
import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Universal Links require the Associated Domains capability, which Apple only
 * grants to paid Developer Program members. Signing with a free personal team
 * fails outright when the entitlement is present, so it is added only once a
 * team ID is configured — locally in .env.local, and in EAS for real builds.
 */
const hasPaidAppleAccount = Boolean(process.env.APPLE_TEAM_ID);

export default ({ config }: ConfigContext): ExpoConfig => {
  const ios = { ...config.ios };

  if (!hasPaidAppleAccount) {
    delete ios.associatedDomains;
  }

  return {
    ...config,
    // slug stays "charana": it is the EAS project handle (REBRAND_PLAN.md D6).
    name: config.name ?? "GOPLAZA",
    slug: config.slug ?? "charana",
    ios,
  };
};

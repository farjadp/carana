// ============================================================================
// Source: apps/mobile/src/lib/analytics.ts
// Version: 1.0.0 — 2026-08-16
// Why: The app half of conversion tracking. Same endpoint and same event
//      names as the website (lib/analytics/track.ts there), so the owner's
//      insights page counts a tap in the app exactly like a tap in a browser.
// Env / Identity: Sends only a business id and an event name. Fire and
//      forget: a failed metric must never delay opening the dialler.
// ============================================================================
import { brand } from "@goplaza/core";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? brand.url).replace(/\/$/, "");

export type BusinessEvent =
  | "view" | "call" | "whatsapp" | "directions" | "website"
  | "booking" | "share" | "email" | "instagram" | "telegram" | "save"
  // Reveal-on-click on a job ad. Applications happen off-site, so this is the
  // only signal an owner gets that their posting worked.
  | "job_apply";

export function trackEvent(businessId: string, type: BusinessEvent) {
  void fetch(`${BASE}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, type, source: "mobile" }),
  }).catch(() => {});
}

// ============================================================================
// Source: lib/analytics/track.ts
// Version: 1.0.0 — 2026-08-16
// Why: One call site for conversion events, so every action row on every
//      surface records the same way. Fire-and-forget with sendBeacon where it
//      exists, because these fire on clicks that navigate away (tel:, maps,
//      an external website) and a normal fetch is cancelled mid-flight.
// Env / Identity: Client. Sends only a business id and an event name.
// ============================================================================
export type BusinessEvent =
  | "view" | "call" | "whatsapp" | "directions" | "website"
  | "booking" | "share" | "email" | "instagram" | "telegram" | "save"
  // Reveal-on-click on a job ad. Applications happen off-site, so this is the
  // only signal an owner ever gets that their posting worked.
  | "job_apply";

export function trackEvent(businessId: string, type: BusinessEvent) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ businessId, type, source: "web" });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

// ============================================================================
// Source: lib/stripe/client.ts
// Version: 1.0.0 — 2026-08-16
// Why: One Stripe instance, one place that decides test vs live, and a loud
//      failure if the key is missing rather than a confusing 500 later.
// Env / Identity: Server only. Never import from a client component.
// ============================================================================
import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  cached = new Stripe(key, {
    // Pinned deliberately: an unpinned version means Stripe can change a
    // response shape under a deployment that has not been tested against it.
    apiVersion: "2026-07-29.dahlia",
    appInfo: { name: "charana", url: "https://charana.ca" },
  });
  return cached;
}

/** True when the configured key is a live key. Used to refuse test-mode UI in production. */
export const isLiveMode = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");

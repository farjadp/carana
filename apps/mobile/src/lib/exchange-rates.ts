// ============================================================================
// Source: apps/mobile/src/lib/exchange-rates.ts
// Version: 1.0.0 — 2026-08-16
// Why: NAVASAN_API_KEY is a server secret and must never ship in the Expo
//      bundle, so this calls the web app's public /api/mobile/exchange-rates
//      route instead of Navasan directly. No auth — a currency rate isn't
//      personal data.
// Env / Identity: Client. Same EXPO_PUBLIC_API_URL base as lib/api.ts.
// ============================================================================
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "https://charana.ca").replace(/\/$/, "");

/** Mirrors apps/web/lib/exchange-rates.ts — `change` is the move since the
 *  previous close, in Toman. */
export type Rate = { value: number; change: number | null };
export type ExchangeRates = { usd: Rate | null; eur: Rate | null; cad: Rate | null };

/** Returns null on any failure — the status bar just omits the rates line
 *  rather than showing a stale or fabricated number. */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(`${BASE}/api/mobile/exchange-rates`);
    if (!res.ok) return null;
    const json = (await res.json()) as { rates: ExchangeRates | null };
    return json.rates ?? null;
  } catch {
    return null;
  }
}

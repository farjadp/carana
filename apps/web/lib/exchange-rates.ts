// ============================================================================
// Source: lib/exchange-rates.ts
// Version: 1.0.0 — 2026-08-16
// Why: Real (free-market, not official/bank) USD/EUR/CAD → Toman rates for
//      the footer widget, via Navasan (api.navasan.tech) — Farjad's choice.
//      Absent NAVASAN_API_KEY, returns null rather than a fabricated or
//      stale-looking number — same "no key, no feature, never a fake value"
//      rule as sendEmail() without RESEND_API_KEY.
//
//      Key names verified against a live response 16 Aug 2026 (300 keys in
//      `/latest/`). The bare `usd` / `eur` / `cad` keys are the headline
//      free-market rates and — checked, not assumed — share one timestamp,
//      so the three shown together are a coherent snapshot rather than
//      three unrelated moments. Values are in **Toman**; sanity-checked
//      against real cross rates at the time (EUR/USD 1.157, CAD/USD 0.72).
//
//      STALENESS IS THE REAL TRAP HERE, not the key names. Navasan keeps
//      returning long-dead symbols with a straight face: `cad_cash` was
//      299 days old and 42% off the live `cad` value. A fallback chain that
//      reached it would print a year-old number as today's rate. Hence
//      MAX_AGE_DAYS — an absent rate is fine, a confidently wrong one is not.
// Env / Identity: Server only.
// ============================================================================
import "server-only";

import { reportQuietFailure } from "@/lib/observability/report";

export type ExchangeRates = { usd: number | null; eur: number | null; cad: number | null };

/** Tried in order per currency. Bare key first: it is the headline rate and
 *  the one all three currencies publish on the same snapshot. */
const SYMBOL_CANDIDATES: Record<keyof ExchangeRates, string[]> = {
  usd: ["usd", "usd_sell"],
  eur: ["eur", "eur_hav"],
  cad: ["cad", "cad_hav"],
};

/** Older than this and the rate is not shown at all. */
const MAX_AGE_DAYS = 3;

type NavasanEntry = { value?: string | number; timestamp?: number } | string | number;

function readValue(raw: unknown, keys: string[], now: number): number | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, NavasanEntry>;
  for (const key of keys) {
    const entry = obj[key];
    if (entry === undefined) continue;
    const isObj = typeof entry === "object" && entry !== null;
    const value = isObj ? entry.value : entry;
    const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) continue;

    // Navasan's `timestamp` is unix seconds. A symbol with no timestamp at
    // all can't be shown to be current, so it is not shown.
    const ts = isObj ? entry.timestamp : undefined;
    if (typeof ts !== "number" || (now - ts * 1000) / 86_400_000 > MAX_AGE_DAYS) continue;

    return n;
  }
  return null;
}

/** Cached 10 minutes — a free-tier key has a request budget, and a currency
 *  rate that is ten minutes old is not a problem for a footer widget. */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  const key = process.env.NAVASAN_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://api.navasan.tech/latest/?api_key=${key}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      reportQuietFailure("exchange_rates_http", { status: res.status });
      return null;
    }
    const data: unknown = await res.json();
    const now = Date.now();

    const rates: ExchangeRates = {
      usd: readValue(data, SYMBOL_CANDIDATES.usd, now),
      eur: readValue(data, SYMBOL_CANDIDATES.eur, now),
      cad: readValue(data, SYMBOL_CANDIDATES.cad, now),
    };

    if (rates.usd === null && rates.eur === null && rates.cad === null) {
      // Either the key names moved or every candidate went stale. Both are
      // silent failures otherwise — the widget would just stay blank forever
      // with nothing saying why.
      reportQuietFailure("exchange_rates_shape", { sampleKeys: Object.keys(data as object).slice(0, 20) });
      return null;
    }

    return rates;
  } catch (error) {
    reportQuietFailure("exchange_rates_fetch_failed", { error: String(error) });
    return null;
  }
}

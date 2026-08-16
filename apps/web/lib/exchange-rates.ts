// ============================================================================
// Source: lib/exchange-rates.ts
// Version: 1.0.0 — 2026-08-16
// Why: Real (free-market, not official/bank) USD/EUR/CAD → Toman rates for
//      the footer widget, via Navasan (api.navasan.tech) — Farjad's choice.
//      Absent NAVASAN_API_KEY, returns null rather than a fabricated or
//      stale-looking number — same "no key, no feature, never a fake value"
//      rule as sendEmail() without RESEND_API_KEY.
//
//      Navasan's `/latest/` response has more symbol keys than we use, and
//      the exact key names for the three we want (buy vs. sell, `_sell`
//      suffix or bare) aren't something I could verify without a live key —
//      FIRST TIME THIS RUNS WITH A REAL KEY, check the logged raw response
//      shape (see `reportQuietFailure("exchange_rates_shape", ...)` below)
//      and adjust SYMBOL_CANDIDATES if the values come back null.
// Env / Identity: Server only.
// ============================================================================
import "server-only";

import { reportQuietFailure } from "@/lib/observability/report";

export type ExchangeRates = { usd: number | null; eur: number | null; cad: number | null };

/** Tried in order per currency — Navasan's key naming isn't fully settled
 *  without a live response to check against. */
const SYMBOL_CANDIDATES: Record<keyof ExchangeRates, string[]> = {
  usd: ["usd_sell", "usd"],
  eur: ["eur_sell", "eur"],
  cad: ["cad_sell", "cad", "cad_harat_naghdi"],
};

type NavasanEntry = { value?: string | number } | string | number;

function readValue(raw: unknown, keys: string[]): number | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, NavasanEntry>;
  for (const key of keys) {
    const entry = obj[key];
    const value = typeof entry === "object" && entry !== null ? entry.value : entry;
    const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
    if (typeof n === "number" && Number.isFinite(n) && n > 0) return n;
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

    const rates: ExchangeRates = {
      usd: readValue(data, SYMBOL_CANDIDATES.usd),
      eur: readValue(data, SYMBOL_CANDIDATES.eur),
      cad: readValue(data, SYMBOL_CANDIDATES.cad),
    };

    if (rates.usd === null && rates.eur === null && rates.cad === null) {
      // The call worked but none of our guessed keys matched — surfaces the
      // first time this runs against a real key so the mapping can be fixed
      // instead of the widget just staying empty forever, silently.
      reportQuietFailure("exchange_rates_shape", { sampleKeys: Object.keys(data as object).slice(0, 20) });
      return null;
    }

    return rates;
  } catch (error) {
    reportQuietFailure("exchange_rates_fetch_failed", { error: String(error) });
    return null;
  }
}

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

/** `change` is the move since the previous close, in Toman. Navasan sends
 *  it alongside every quote; null when the symbol omits it. */
export type Rate = { value: number; change: number | null };
export type ExchangeRates = { usd: Rate | null; eur: Rate | null; cad: Rate | null };

/** Tried in order per currency. Bare key first: it is the headline rate and
 *  the one all three currencies publish on the same snapshot. */
const SYMBOL_CANDIDATES: Record<keyof ExchangeRates, string[]> = {
  usd: ["usd", "usd_sell"],
  eur: ["eur", "eur_hav"],
  cad: ["cad", "cad_hav"],
};

/** Older than this and the rate is not shown at all. */
const MAX_AGE_DAYS = 3;

/** How long a successful snapshot is served without going back to Navasan. */
const CACHE_MS = 10 * 60_000;

/**
 * How long to stop calling after a failure.
 *
 * `next: { revalidate }` is not a rate limit. It is per serverless instance,
 * and it does not dedupe a *failed* fetch at all — so a Navasan outage turned
 * into one upstream call per render across every warm lambda. On 27 Aug that
 * had burned the whole monthly quota (429 "Monthly quota exceeded") and
 * written 205,800 exchange_rates_shape rows into system_errors, which is 97%
 * of everything in that table.
 *
 * Quota exhaustion is not retryable for hours, so it is backed off hardest:
 * nothing this widget does will make the counter reset sooner.
 */
const BACKOFF_MS = 15 * 60_000;
const QUOTA_BACKOFF_MS = 6 * 60 * 60_000;

/**
 * OFF since 27 Aug 2026, on Farjad's call — set to `true` to bring it back.
 *
 * The Navasan key's monthly quota is spent and its data stopped moving nine
 * days ago, so every call ends in a rejected rate and a log row. The backoff
 * added the same day cuts that to one row per instance per fifteen minutes,
 * which is survivable but still not zero across a fleet, and there is nothing
 * to be gained by asking: the widget cannot show a number until the key is
 * renewed. So it does not ask.
 *
 * Nothing else changes. `null` is the path the footer has always taken when
 * rates are unavailable, so the widget simply does not render — no placeholder,
 * no stale figure, no "temporarily unavailable" box claiming a feature exists.
 */
const ENABLED = false;

/** Module scope: one per instance, which is the granularity the API bills at. */
let cached: { at: number; rates: ExchangeRates } | null = null;
let blockedUntil = 0;

type NavasanEntry = { value?: string | number; change?: number; timestamp?: number } | string | number;

function readValue(raw: unknown, keys: string[], now: number): Rate | null {
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

    const change = isObj && typeof entry.change === "number" && Number.isFinite(entry.change) ? entry.change : null;
    return { value: n, change };
  }
  return null;
}

/**
 * Why each candidate was rejected: absent, no timestamp, N days old, or an
 * unusable value. This is the whole diagnosis — without it a shape failure
 * cannot be told apart from a staleness failure.
 */
function describeCandidates(raw: unknown, now: number): Record<string, string> {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, NavasanEntry>;
  const out: Record<string, string> = {};
  for (const keys of Object.values(SYMBOL_CANDIDATES)) {
    for (const key of keys) {
      const entry = obj[key];
      if (entry === undefined) {
        out[key] = "absent";
        continue;
      }
      const isObj = typeof entry === "object" && entry !== null;
      const value = isObj ? entry.value : entry;
      const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
      if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
        out[key] = "unusable value";
        continue;
      }
      const ts = isObj ? entry.timestamp : undefined;
      if (typeof ts !== "number") {
        out[key] = "no timestamp";
        continue;
      }
      out[key] = `${((now - ts * 1000) / 86_400_000).toFixed(1)}d old`;
    }
  }
  return out;
}

/**
 * The footer's three rates, or null when they cannot be shown honestly.
 *
 * Served from a 10-minute in-process cache, and after a failure the upstream
 * is left alone entirely until the backoff expires — a blank widget is the
 * correct outcome of a dead API, and it must not cost a request per render to
 * arrive at it.
 */
export async function getExchangeRates(): Promise<ExchangeRates | null> {
  if (!ENABLED) return null;

  const key = process.env.NAVASAN_API_KEY;
  if (!key) return null;

  const now0 = Date.now();
  if (cached && now0 - cached.at < CACHE_MS) return cached.rates;
  if (now0 < blockedUntil) {
    // Inside a backoff: serve the last good snapshot if it is still inside
    // the freshness rule, otherwise show nothing. Never a stale number.
    return cached && now0 - cached.at < MAX_AGE_DAYS * 86_400_000 ? cached.rates : null;
  }

  try {
    const res = await fetch(`https://api.navasan.tech/latest/?api_key=${key}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      const quota = res.status === 429;
      blockedUntil = Date.now() + (quota ? QUOTA_BACKOFF_MS : BACKOFF_MS);
      reportQuietFailure("exchange_rates_http", { status: res.status, quota });
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
      //
      // The old report sent the first 20 of ~300 keys, which answered
      // neither question: `usd` and `cad` are not in the first 20, so
      // 205,800 identical rows never once said whether the key was missing
      // or merely old. It now names the candidates it actually looked at.
      blockedUntil = Date.now() + BACKOFF_MS;
      reportQuietFailure("exchange_rates_shape", { candidates: describeCandidates(data, now) });
      return null;
    }

    cached = { at: Date.now(), rates };
    return rates;
  } catch (error) {
    blockedUntil = Date.now() + BACKOFF_MS;
    reportQuietFailure("exchange_rates_fetch_failed", { error: String(error) });
    return null;
  }
}

// ============================================================================
// Source: app/api/mobile/exchange-rates/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: Mobile has no server env access — NAVASAN_API_KEY must never ship in
//      the Expo bundle, so the app calls this instead of Navasan directly.
//      Public, no auth: a currency rate is not personal data. The Tehran
//      clock/date itself is not served here — mobile computes it locally
//      with the same @goplaza/core functions the web footer uses, since
//      Expo's Hermes has full Intl/ICU support and needs no network call
//      for that part.
// Env / Identity: Public GET. Server only (reads NAVASAN_API_KEY).
// ============================================================================
import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";

export async function GET() {
  const rates = await getExchangeRates();
  return NextResponse.json({ rates });
}

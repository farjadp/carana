// ============================================================================
// Source: app/api/mobile/search/smart/route.ts
// Version: 1.0.0 — 2026-08-24
// Why: The mobile half of the smart-search layer. `lib/search/smart.ts` needs
//      a service-role client and OPENAI_API_KEY, neither of which may ever
//      reach the Expo bundle, so the app asks this route instead.
//
//      **It returns search TERMS, never results.** The app re-runs the same
//      `search_businesses` / `search_announcements` RPCs a hand-typed query
//      would hit, so the model cannot put a business on screen that does not
//      exist — the same guarantee the website's version makes, kept by
//      giving mobile the same shape rather than a convenient shortcut.
//
//      Public and unauthenticated on purpose: search works signed-out on
//      both surfaces, so requiring a session here would have meant the
//      feature quietly not existing for most visitors. Spending is still
//      bounded, because every gate lives inside expandQuery and not in the
//      caller — query shape, the admin kill switch, the forever-cache, the
//      per-IP limit, and the daily cap counted in the database. This route
//      adds no gate of its own and must not be given one that the web page
//      does not also have, or the two surfaces would drift.
//
//      Fail-soft, like the web page: any problem returns `{ smart: null }`
//      with a 200 and the app stays lexical. A bonus layer must never
//      surface an error for a search that already worked.
// Env / Identity: Public GET. Server only (service role + OPENAI_API_KEY,
//      both used inside expandQuery and neither returned).
// ============================================================================
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { expandQuery } from "@/lib/search/smart";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ smart: null });

  // Same per-IP key the web page derives, so a phone and a browser behind one
  // address share the limit instead of each getting a fresh allowance.
  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  try {
    const smart = await expandQuery(q, ip);
    return NextResponse.json({
      // Explicit field list: whatever expandQuery grows later, this route
      // keeps returning terms and labels only.
      smart: smart
        ? { terms: smart.terms, categories: smart.categories, reason: smart.reason }
        : null,
    });
  } catch {
    return NextResponse.json({ smart: null });
  }
}

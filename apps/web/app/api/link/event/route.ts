// ============================================================================
// Source: app/api/link/event/route.ts
// Version: 1.0.0 — 2026-08-25
// Why: Record what a bio page actually did — a view, and a tap on each link.
//      This is the raw material for everything sold in the analytics tiers,
//      and it exists BEFORE the domain is connected because the dimensions it
//      captures cannot be backfilled. A referrer not written at request time
//      is gone; a page that is publicly reachable and recording nothing spends
//      its first traffic and keeps none of it.
//
//      THE CLIENT SENDS ONLY WHICH PAGE AND WHICH ITEM. Referrer, device,
//      city, visitor hash and botness are all derived server-side from the
//      request — see lib/analytics/visitor.ts. A caller that can write its own
//      dimensions can write its own numbers, and then they are not
//      measurements.
//
//      Deliberately mirrors app/api/events/route.ts, which does the same job
//      for listings, down to sharing the visitor hash rather than
//      re-implementing it.
// Env / Identity: Server only. Service role, because no RLS policy grants
//      anon an insert on link_events — the same reason the listing events
//      route uses it. Anonymous by design: no IP is ever stored.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { classifyDevice, referrerHost, requestCity, visitorHash } from "@/lib/analytics/visitor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only the two types the page can actually produce. `event_types` in the
 * database is a registry precisely so a new metric needs no migration — but a
 * public endpoint is not where the registry gets read, because that would let
 * anyone post any type that exists. New types are added here consciously.
 */
const TYPES = new Set(["link_view", "link_click"]);

export async function POST(req: NextRequest) {
  let body: { pageId?: string; itemId?: string | null; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pageId = String(body.pageId ?? "");
  const type = String(body.type ?? "");
  const itemId = body.itemId ? String(body.itemId) : null;

  if (!UUID.test(pageId) || !TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });
  if (itemId && !UUID.test(itemId)) return NextResponse.json({ ok: false }, { status: 400 });

  const hash = visitorHash(req);
  // Generous enough that a real person tapping around is never throttled, tight
  // enough that a script cannot meaningfully inflate a page's numbers.
  const limit = rateLimit(`link:${hash}:${pageId}:${type}:${itemId ?? ""}`, type === "link_view" ? 5 : 20, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ ok: true, throttled: true });

  const { device, bot } = classifyDevice(req);
  const admin = createSupabaseAdminClient();

  // A foreign key on page_id means an id for a page that does not exist is
  // rejected by the database rather than needing a lookup here.
  const { error } = await admin.from("link_events").insert({
    page_id: pageId,
    item_id: itemId,
    event_type: type,
    source: "web",
    visitor_hash: hash,
    referrer_host: referrerHost(req),
    device,
    city: requestCity(req),
    bot,
  });
  if (error) console.error("link event: insert failed", error);

  // Always 200: telemetry must never break the page it is measuring.
  return NextResponse.json({ ok: true });
}

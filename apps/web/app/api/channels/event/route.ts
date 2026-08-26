// ============================================================================
// Source: app/api/channels/event/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: Record what a channel entry actually did on our side — a page view, and
//      a tap on «عضویت».
//
//      The join click is the more useful of the two and the one that ranks: a
//      view means somebody opened the page, a join click means somebody
//      actually went. It is also the only number in this whole section that is
//      wholly ours — everything else is either measured from a public page or
//      claimed by a submitter.
//
//      THE CLIENT SENDS ONLY WHICH CHANNEL AND WHICH TYPE. Referrer, device,
//      visitor hash and botness are derived server-side — a caller that can
//      write its own dimensions can write its own numbers, and then they are
//      not measurements. Mirrors app/api/link/event/route.ts down to sharing
//      the visitor hash rather than re-implementing it.
// Env / Identity: Server only. Service role, because no RLS policy grants anon
//      an insert on channel_events. Anonymous by design: no IP is stored.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { classifyDevice, referrerHost, visitorHash } from "@/lib/analytics/visitor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The registry in `event_types` exists so a new metric needs no migration, but
// a public endpoint is not where it gets read — that would let anyone post any
// type that exists. New types are added here consciously.
const TYPES = new Set(["channel_view", "channel_join_click"]);

export async function POST(req: NextRequest) {
  let body: { channelId?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const channelId = String(body.channelId ?? "");
  const type = String(body.type ?? "");
  if (!UUID.test(channelId) || !TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

  const hash = visitorHash(req);
  const limit = rateLimit(`channel:${hash}:${channelId}:${type}`, type === "channel_view" ? 5 : 20, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ ok: true, throttled: true });

  const { device, bot } = classifyDevice(req);
  const admin = createSupabaseAdminClient();

  // The foreign key on channel_id means an id for a channel that does not
  // exist is rejected by the database rather than needing a lookup here.
  const { error } = await admin.from("channel_events").insert({
    channel_id: channelId,
    event_type: type,
    source: "web",
    visitor_hash: hash,
    referrer_host: referrerHost(req),
    device,
    bot,
  });
  if (error) console.error("channel event: insert failed", error);

  // Always 200: telemetry must never break the page it is measuring.
  return NextResponse.json({ ok: true });
}

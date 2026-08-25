// ============================================================================
// Source: app/api/events/route.ts
// Version: 1.1.0 — 2026-08-25
// Why: Record the conversion moment — a tap on call, WhatsApp, directions,
//      website, booking. This is the only honest answer to "what did this
//      listing do for me", and the owner dashboard reads it.
//      v1.1 (25 Aug): visitorHash and the referrer-host reduction moved to
//      lib/analytics/visitor.ts and are now shared with the link-in-bio
//      ingest. Two hashing schemes would be two definitions of "unique
//      visitor", and the owner dashboard would count one person twice
//      depending on which surface they arrived through.
// Env / Identity: Server only. Anonymous by design; the visitor is reduced to
//      a hash of ip+UA+today+salt, so the same person is counted once a day
//      and cannot be followed across days. No IP is ever stored.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { referrerHost, visitorHash } from "@/lib/analytics/visitor";

const TYPES = new Set(["view", "call", "whatsapp", "directions", "website", "booking", "share", "email", "instagram", "telegram", "save", "job_apply"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { businessId?: string; type?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const businessId = String(body.businessId ?? "");
  const type = String(body.type ?? "");
  if (!UUID.test(businessId) || !TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

  const hash = visitorHash(req);
  // Generous, but a script cannot inflate a listing's numbers meaningfully.
  const limit = rateLimit(`events:${hash}:${businessId}:${type}`, type === "view" ? 5 : 20, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ ok: true, throttled: true });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("business_events").insert({
    business_id: businessId,
    event_type: type,
    source: body.source === "mobile" ? "mobile" : "web",
    visitor_hash: hash,
    // Host only — a full URL can carry a query string with personal data.
    referrer: referrerHost(req),
  });
  if (error) console.error("events: insert failed", error);

  // Always 200: telemetry must never break the page it is measuring.
  return NextResponse.json({ ok: true });
}

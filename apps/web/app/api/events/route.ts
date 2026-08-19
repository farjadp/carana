// ============================================================================
// Source: app/api/events/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: Record the conversion moment — a tap on call, WhatsApp, directions,
//      website, booking. This is the only honest answer to "what did this
//      listing do for me", and the owner dashboard reads it.
// Env / Identity: Server only. Anonymous by design; the visitor is reduced to
//      a hash of ip+UA+today+salt, so the same person is counted once a day
//      and cannot be followed across days. No IP is ever stored.
// ============================================================================
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const TYPES = new Set(["view", "call", "whatsapp", "directions", "website", "booking", "share", "email", "instagram", "telegram", "save", "job_apply"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function visitorHash(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  // Fallback salt kept verbatim through the rebrand so hashes stay stable.
  const salt = process.env.CRON_SECRET ?? "charana";
  return createHash("sha256").update(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}|${salt}`).digest("hex").slice(0, 32);
}

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

  const referrer = req.headers.get("referer");
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("business_events").insert({
    business_id: businessId,
    event_type: type,
    source: body.source === "mobile" ? "mobile" : "web",
    visitor_hash: hash,
    // Host only — a full URL can carry a query string with personal data.
    referrer: referrer ? (() => { try { return new URL(referrer).host; } catch { return null; } })() : null,
  });
  if (error) console.error("events: insert failed", error);

  // Always 200: telemetry must never break the page it is measuring.
  return NextResponse.json({ ok: true });
}

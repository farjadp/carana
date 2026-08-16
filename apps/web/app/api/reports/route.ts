// ============================================================================
// Source: app/api/reports/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: The profile's "report a problem" button used to show a toast and write
//      nothing — it told the user a falsehood. It posts here now, the row
//      lands in /admin/reports, and the response only claims what happened.
// Env / Identity: Server only. Anonymous allowed (someone reporting a
//      fraudulent listing should not have to register first); rate-limited,
//      attributed when a session exists.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { authenticateBearer } from "@/lib/auth/bearer";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const REASONS = new Set(["closed", "wrong_info", "duplicate", "not_iranian", "spam", "offensive", "impersonation", "other"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const bearer = await authenticateBearer(req);
  if (bearer) return bearer.user.id;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`reports:${userId ?? `ip:${ip}`}`, 8, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "گزارش‌های زیادی فرستاده‌اید. کمی بعد دوباره تلاش کنید." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { businessId?: string; reason?: string; details?: string; contact?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const businessId = String(body.businessId ?? "");
  const reason = String(body.reason ?? "");
  if (!UUID.test(businessId)) return NextResponse.json({ success: false, error: "کسب‌وکار نامعتبر است." }, { status: 400 });
  if (!REASONS.has(reason)) return NextResponse.json({ success: false, error: "دلیل گزارش را انتخاب کنید." }, { status: 400 });

  const details = String(body.details ?? "").replace(/\s+/g, " ").trim().slice(0, 2000);
  if (reason === "other" && details.length < 5) {
    return NextResponse.json({ success: false, error: "برای «موارد دیگر» توضیح بنویسید." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: exists } = await admin.from("businesses").select("id").eq("id", businessId).maybeSingle();
  if (!exists) return NextResponse.json({ success: false, error: "کسب‌وکار پیدا نشد." }, { status: 404 });

  const { error } = await admin.from("business_reports").insert({
    business_id: businessId,
    reporter_id: userId,
    reason,
    details: details || null,
    contact: String(body.contact ?? "").trim().slice(0, 200) || null,
    source: body.source === "mobile" ? "mobile" : "web",
  });
  if (error) {
    console.error("reports: insert failed", error);
    return NextResponse.json({ success: false, error: "ثبت گزارش ناموفق بود." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

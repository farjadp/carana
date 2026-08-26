// ============================================================================
// Source: app/api/admin/loyalty/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: The write path for «وفاداری مالک»'s green knobs — the master switch and
//      the tier ladder. Kept off /api/admin/settings on purpose: that route's
//      shapes are all feature toggles, and this one moves money, so its
//      validation lives where a reviewer will look for it.
// Env / Identity: Admin role only (not moderator).
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { setLoyaltySettings } from "@/lib/loyalty/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Tier = z.object({
  months: z.number().int().min(1).max(600),
  // Capped at 50%: a loyalty ladder is not the place a half-price plan gets
  // created by a slipped keystroke.
  percentOff: z.number().int().min(0).max(50),
  bonusPhotos: z.number().int().min(0).max(100),
  bonusAnnouncements: z.number().int().min(0).max(100),
  labelFa: z.string().trim().min(1).max(80),
});

const Shape = z.object({
  enabled: z.boolean(),
  graceDays: z.number().int().min(1).max(365),
  tiers: z.array(Tier).min(1).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase, ["admin"]);
    const parsed = Shape.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "مقادیر نامعتبر است." }, { status: 400 });
    }
    const result = await setLoyaltySettings(parsed.data, user.id);
    if (!result.ok) {
      return NextResponse.json({ error: `ذخیره نشد: ${result.error ?? "خطای ناشناخته"}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/loyalty:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}

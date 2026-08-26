// ============================================================================
// Source: app/api/admin/standing/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: The write path for standing_rules — the per-kind half of the green
//      knobs (the settings half rides /api/admin/settings, which already
//      whitelists shapes per key). Only existing kinds can be patched: adding
//      a kind is deliberately NOT possible from the admin (docs/16, red
//      list) — a rule with no call site emitting it is a setting that
//      silently does nothing.
// Env / Identity: Admin role only (not moderator) — these numbers are the
//      economy.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { setRule } from "@/lib/standing/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PatchShape = z.object({
  kind: z.string().min(1).max(64),
  patch: z
    .object({
      points: z.number().int().min(0).max(10_000).optional(),
      daily_cap: z.number().int().min(0).max(1_000).optional(),
      enabled: z.boolean().optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: "empty patch" }),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase, ["admin"]);

    const parsed = PatchShape.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
    }

    const result = await setRule(parsed.data.kind, parsed.data.patch, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: `ذخیره نشد: ${result.error ?? "خطای ناشناخته"}. اگر جدول standing_rules وجود ندارد، مایگریشن 20260830420000 هنوز اجرا نشده.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/standing:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}

// ============================================================================
// Source: app/api/admin/settings/route.ts
// Version: 1.0.0 — 2026-08-19
// Why: The write path for site_settings. One route, whitelisted keys with a
//      zod shape each — a settings store that accepts arbitrary JSON from
//      the browser is a config injection surface even behind requireAdmin.
// Env / Identity: Admin role only (not moderator) — these switches gate paid
//      features and AI spend.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { SETTING_KEYS, setSetting } from "@/lib/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SHAPES: Record<string, z.ZodTypeAny> = {
  [SETTING_KEYS.smartSearch]: z.object({
    enabled: z.boolean(),
    daily_cap: z.number().int().min(0).max(10_000),
  }),
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase, ["admin"]);

    const body = (await req.json().catch(() => ({}))) as { key?: string; value?: unknown };
    const shape = body.key ? SHAPES[body.key] : undefined;
    if (!shape) return NextResponse.json({ error: "کلید تنظیمات ناشناخته است." }, { status: 400 });

    const parsed = shape.safeParse(body.value);
    if (!parsed.success) {
      return NextResponse.json({ error: "مقدار تنظیمات نامعتبر است." }, { status: 400 });
    }

    const result = await setSetting(body.key!, parsed.data as Record<string, unknown>, user.id);
    if (!result.ok) {
      // Most likely cause until the migration runs: table does not exist.
      return NextResponse.json(
        { error: `ذخیره نشد: ${result.error ?? "خطای ناشناخته"}. اگر جدول site_settings وجود ندارد، مایگریشن 20260830310000 هنوز اجرا نشده.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/settings:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}

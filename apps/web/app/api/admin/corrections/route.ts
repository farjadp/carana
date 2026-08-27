// ============================================================================
// Source: app/api/admin/corrections/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: Apply or reject a queued correction. Both go through
//      lib/corrections/apply.ts so the admin path and the auto-publish path
//      cannot disagree about what "applied" means, or forget to settle the
//      ledger.
//
//      A rejection requires a reason, enforced here: it reverses the
//      proposer's ledger event, and a reversal with no reason is the row they
//      will ask about.
// Env / Identity: Admin or moderator — this is queue work, not economy work.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { applyCorrection, rejectCorrection } from "@/lib/corrections/apply";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Shape = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply"), id: z.string().uuid(), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("reject"), id: z.string().uuid(), note: z.string().trim().min(3).max(500) }),
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase);
    const parsed = Shape.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "درخواست نامعتبر است — رد کردن دلیل می‌خواهد." }, { status: 400 });
    }
    const admin = createSupabaseAdminClient();
    const result =
      parsed.data.action === "apply"
        ? await applyCorrection(admin, parsed.data.id, user.id, { directly: false, note: parsed.data.note })
        : await rejectCorrection(admin, parsed.data.id, user.id, parsed.data.note);
    if (!result.ok) return NextResponse.json({ error: result.error ?? "ناموفق" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/corrections:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}

// ============================================================================
// Source: app/api/admin/standing/actions/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: The amber list of docs/16 — the four admin actions on a user or a
//      single event. Every one requires a typed reason, ENFORCED HERE and not
//      by the form (a client-side-only requirement is not a requirement), and
//      every one writes a user_activity_logs row, because these are the
//      actions that get asked about later.
// Env / Identity: Admin role only (not moderator).
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { recomputeUser } from "@/lib/standing/ledger";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Shape = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("settle_event"),
    eventId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("reverse_event"),
    eventId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("grant_level"),
    userId: z.string().uuid(),
    // null revokes; 0..3 pins. In practice only 3 (نگهبان) and null are used,
    // but pinning lower is a legitimate containment tool.
    level: z.number().int().min(0).max(3).nullable(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("freeze"),
    userId: z.string().uuid(),
    frozen: z.boolean(),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("recompute"),
    userId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase, ["admin"]);
    const parsed = Shape.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "درخواست نامعتبر است — دلیل (حداقل ۳ کاراکتر) اجباری است." },
        { status: 400 }
      );
    }
    const input = parsed.data;
    const admin = createSupabaseAdminClient();

    let outcome = "";
    switch (input.action) {
      case "settle_event": {
        // Manual settle bypasses the six guards on purpose — that is what
        // makes it amber: the admin is overriding, with a reason, and the
        // freeze still happens (points/version copied from the rule now).
        const { data: ev } = await admin
          .from("standing_events")
          .select("id, user_id, kind, state")
          .eq("id", input.eventId)
          .maybeSingle();
        if (!ev) return NextResponse.json({ error: "رویداد پیدا نشد." }, { status: 404 });
        if (ev.state !== "pending")
          return NextResponse.json({ error: `رویداد در وضعیت ${ev.state} است، نه در انتظار.` }, { status: 400 });
        const { data: rule } = await admin
          .from("standing_rules")
          .select("points, version")
          .eq("kind", ev.kind)
          .maybeSingle();
        if (!rule) return NextResponse.json({ error: "قاعده‌ی این نوع پیدا نشد." }, { status: 400 });
        const { error } = await admin
          .from("standing_events")
          .update({
            state: "confirmed",
            points: rule.points,
            rule_version: rule.version,
            settled_at: new Date().toISOString(),
            settled_by: user.id,
            reason: input.reason,
          })
          .eq("id", ev.id)
          .eq("state", "pending");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await recomputeUser(ev.user_id);
        outcome = `settle_event ${ev.id}`;
        break;
      }
      case "reverse_event": {
        const { data: ev } = await admin
          .from("standing_events")
          .select("id, user_id, state")
          .eq("id", input.eventId)
          .maybeSingle();
        if (!ev) return NextResponse.json({ error: "رویداد پیدا نشد." }, { status: 404 });
        if (ev.state !== "confirmed" && ev.state !== "pending")
          return NextResponse.json({ error: `رویداد در وضعیت ${ev.state} است.` }, { status: 400 });
        const { error } = await admin
          .from("standing_events")
          .update({
            state: "reversed",
            settled_at: new Date().toISOString(),
            settled_by: user.id,
            reason: input.reason,
          })
          .eq("id", ev.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await recomputeUser(ev.user_id);
        outcome = `reverse_event ${ev.id}`;
        break;
      }
      case "grant_level": {
        const { error } = await admin
          .from("user_standing")
          .upsert({ user_id: input.userId, level_grant: input.level, admin_note: input.reason });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        outcome = `grant_level ${input.level ?? "revoked"} → ${input.userId}`;
        break;
      }
      case "freeze": {
        const { error } = await admin
          .from("user_standing")
          .upsert({ user_id: input.userId, frozen: input.frozen, admin_note: input.reason });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        outcome = `${input.frozen ? "freeze" : "unfreeze"} ${input.userId}`;
        break;
      }
      case "recompute": {
        await recomputeUser(input.userId);
        outcome = `recompute ${input.userId}`;
        break;
      }
    }

    // The audit row. Failure here fails the request loudly: an unlogged amber
    // action is worse than a refused one.
    const { error: logError } = await admin.from("user_activity_logs").insert({
      user_id: user.id,
      action: "STANDING_ADMIN",
      metadata: { outcome, reason: input.reason, input },
    });
    if (logError) {
      return NextResponse.json(
        { error: `اقدام انجام شد ولی لاگ نشد: ${logError.message} — اگر enum مقدار STANDING_ADMIN ندارد، مایگریشن 20260830420000 کامل اجرا نشده.` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/standing/actions:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}

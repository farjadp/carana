// ============================================================================
// Source: app/api/cron/blog-source/route.ts
// Version: 1.1.0 — 2026-09-05
// Why: The source-driven writer on a schedule. Vercel cron calls it with
//      `Authorization: Bearer $CRON_SECRET`; an admin can call it by hand with
//      `?n=` for a different count, `?dry=1` to skip the image spend, or
//      `?publish=1` to go straight live instead of into the review queue.
//
//      The schedule in vercel.json calls this as `?n=2&publish=1` (Farjad,
//      5 Sep): two articles a day, straight live. Two rather than three
//      because this writer refuses more than it writes — the originality
//      gate turned down enough that it delivered 1–4 a day over the ten days
//      to 5 Sep, averaging 2.5. The third of the daily three comes from
//      blog-generate, which always delivers its number. On a thin news day
//      this one writes fewer and the day is short; that is the gate working,
//      not a fault to pad around.
//
//      maxDuration is the hard limit here, not the model. Each article is
//      three model passes plus two images and runs sequentially, so a run of
//      ten will not finish inside one invocation — anything it does not reach
//      stays `new` in the ledger and is picked up by the next run. That is why
//      BLOG_SOURCE_PER_DAY defaults to 5.
// Env / Identity: Server only. Same auth shape as blog-generate.
// ============================================================================
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { generateFromSources } from "@/lib/blog/source-writer";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DEFAULT_PER_DAY = Number(process.env.BLOG_SOURCE_PER_DAY ?? 5);
const MAX_PER_RUN = 10;

function cronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function adminAuthorised(): Promise<boolean> {
  try {
    await requireAdmin(await createSupabaseActionClient());
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!cronAuthorised(req) && !(await adminAuthorised())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const n = Math.min(MAX_PER_RUN, Math.max(1, Number(url.searchParams.get("n") ?? DEFAULT_PER_DAY) || DEFAULT_PER_DAY));
  const dryRun = url.searchParams.get("dry") === "1";
  const publish = url.searchParams.get("publish") === "1" ? true : undefined;

  const result = await generateFromSources(n, { dryRun, publish });
  return NextResponse.json({ ok: true, requested: n, dryRun, ...result });
}

// ============================================================================
// Source: app/api/cron/blog-generate/route.ts
// Version: 1.1.0 — 2026-09-05
// Why: Daily writer. Vercel cron calls it with `Authorization: Bearer
//      $CRON_SECRET`; an admin can call it manually with `?n=` to write more
//      or `?dry=1` to see briefs without spending on images.
//
//      The schedule in vercel.json calls this as `?n=1&publish=1` (Farjad,
//      5 Sep): one article a day, straight live. The query string wins over
//      BLOG_POSTS_PER_DAY and BLOG_AUTO_PUBLISH, so changing either env var
//      will NOT change what the cron does — edit the path in vercel.json.
//      Called without those params it still writes five into the review
//      queue, which is what a manual run should do.
// Env / Identity: Server only. Same auth shape as verification-reminders.
// ============================================================================
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { generatePosts } from "@/lib/blog/generate";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_PER_DAY = Number(process.env.BLOG_POSTS_PER_DAY ?? 5);
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

  const result = await generatePosts(n, { dryRun, publish });
  return NextResponse.json({ ok: true, requested: n, dryRun, ...result });
}

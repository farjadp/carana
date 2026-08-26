// ============================================================================
// Source: app/api/cron/blog-snippet/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: The daily card. Vercel cron calls it twice a day; each run writes one
//      snippet from a published article and posts it to the channel.
//
//      Two runs of one rather than one run of two, and spread across the day:
//      two cards landing in the same minute read as a batch, which is the
//      thing this feature exists to avoid. The article shares are a different
//      stream and keep their own schedule.
//
//      `?dry=1` writes nothing and sends nothing — it returns what the writer
//      would have produced, which is how to sample the tone before letting it
//      run unattended. `?send=0` stores the card in the queue without posting,
//      for when someone wants to read it first.
// Env / Identity: Server only. Same auth shape as the other blog crons.
// ============================================================================
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { generateSnippets } from "@/lib/blog/snippets";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_PER_RUN = Number(process.env.BLOG_SNIPPETS_PER_RUN ?? 1);
const MAX_PER_RUN = 5;

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
  const n = Math.min(MAX_PER_RUN, Math.max(1, Number(url.searchParams.get("n") ?? DEFAULT_PER_RUN) || DEFAULT_PER_RUN));
  const dryRun = url.searchParams.get("dry") === "1";
  const send = url.searchParams.get("send") !== "0" && !dryRun;

  const result = await generateSnippets(n, { send, dryRun });
  return NextResponse.json({ ok: true, requested: n, dryRun, sendEnabled: send, ...result });
}

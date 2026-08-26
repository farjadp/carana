// ============================================================================
// Source: app/api/cron/blog-syndicate/route.ts
// Version: 1.0.0 — 2026-08-24
// Why: Drip the syndication backlog. Vercel cron calls it daily with
//      `Authorization: Bearer $CRON_SECRET`; an admin can call it by hand with
//      `?n=` to send more in one go and `?channel=` to pick one.
//
//      A drip rather than a flood, and the default is deliberately small.
//      When Telegram was first connected the blog already had 74 published
//      posts; sending them back to back would have been 74 notifications to a
//      channel nobody had joined yet, which reads as a bot dumping rather than
//      a publication publishing. BLOG_SYNDICATE_PER_RUN is the pace.
//
//      New posts do not need this: BLOG_SYNDICATE_ON_PUBLISH shares them the
//      moment they go live. This route is for the backlog, and afterwards as a
//      safety net for anything whose share failed.
// Env / Identity: Server only. Same auth shape as blog-generate.
// ============================================================================
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { CHANNELS, backlogCounts, syndicateBacklog, type Channel } from "@/lib/blog/syndicate";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DEFAULT_PER_RUN = Number(process.env.BLOG_SYNDICATE_PER_RUN ?? 3);
// 3.5 s between sends against an 800 s ceiling, with headroom for the sends
// themselves. Asking for more than this would silently truncate.
const MAX_PER_RUN = 150;

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
  const asked = url.searchParams.get("channel") as Channel | null;
  const channels = asked && CHANNELS.includes(asked) ? [asked] : CHANNELS;

  // `?dry=1` reports the backlog without sending anything — the safe way to
  // check a new connection before it starts posting in public.
  if (url.searchParams.get("dry") === "1") {
    return NextResponse.json({ ok: true, dryRun: true, backlog: await backlogCounts() });
  }

  const results = [];
  for (const channel of channels) results.push(await syndicateBacklog(channel, { limit: n }));
  return NextResponse.json({ ok: true, requested: n, results });
}

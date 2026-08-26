// ============================================================================
// Source: components/channels/related-channels.tsx
// Version: 1.0.0 — 2026-08-26
// Why: Five other channels at the foot of a channel page, so the page has an
//      exit that is not the back link. A directory whose every leaf is a
//      dead end asks the reader to start over on each one.
//
//      RANDOM, NOT "RELATED". Ordering by shared category would rank a
//      four-entry section by an attribute it barely has, and calling it
//      «مرتبط» when it is «هرچه بود» is a small lie in a section built to
//      avoid those. It is a shuffle, and the heading says so.
//
//      The shuffle happens per RENDER, and the page it sits on is cached for
//      an hour — so everybody who arrives in that hour sees the same five.
//      Same trait as the random order on /businesses, and the same reason: a
//      per-visitor shuffle costs a dynamic render on every leaf page.
//
//      VIEW COUNTS ARE SHOWN HERE AND FLOORED ON THE PAGE ITSELF. Beside four
//      other channels a number is a comparison, not a claim, so anything above
//      zero is worth reading; as a lone headline it needs the floor. Neither
//      prints a zero — the absence of traffic is not a number worth publishing
//      about somebody else's channel.
// Env / Identity: Server Component. Anon client; RLS shows published only.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Eye, MessageCircle, Send } from "lucide-react";

import {
  CHANNEL_ACTIVITY_LABELS_FA,
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_PENDING_FA,
  channelActivity,
  channelMetricsState,
  channelOwnership,
  hasAnyViews,
  type ChannelKind,
  type ChannelPlatform,
} from "@goplaza/core";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const HOW_MANY = 5;
/** How wide the shuffle looks. Small enough to stay one cheap query. */
const POOL = 60;

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * Fisher–Yates. Module scope because Math.random() in a component body is an
 * impure call during render as far as the react compiler is concerned — the
 * same rule that moved every Date.now() out of a body (docs/06-gotchas).
 */
function shuffle<T>(pool: readonly T[]): T[] {
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function RelatedChannels({ excludeId }: { excludeId: string }) {
  const supabase = await createSupabaseServerClient();
  const live = `confirm_by.is.null,confirm_by.gt.${new Date().toISOString()}`;

  const { data } = await supabase
    .from("channels")
    .select(
      "id, slug, title, platform, kind, city, metrics_source, member_count, last_post_at, metrics_checked_at, owner_user_id, owner_verified_at, owner_verified_until, owner_verified_method",
    )
    .eq("status", "published")
    .or(live)
    .neq("id", excludeId)
    .order("last_post_at", { ascending: false, nullsFirst: false })
    .limit(POOL);

  const pool = data ?? [];
  if (pool.length === 0) return null;

  const picks = shuffle(pool).slice(0, HOW_MANY);

  // One query for all five view counts rather than five RPC round trips.
  // analytics_daily is the permanent rollup, so this is the lifetime figure.
  //
  // It reads through the anon client, which needs the "Channel view counts are
  // public" policy from 20260830440000. Until that migration is applied this
  // returns nothing and the strip shows no numbers — the same thing it shows
  // for a channel nobody has opened, which is the honest degradation and the
  // reason this could ship before the migration.
  const { data: viewRows } = await supabase
    .from("analytics_daily")
    .select("subject_id, n")
    .eq("subject_kind", "channel")
    .eq("event_type", "channel_view")
    .eq("dimension", "")
    .in(
      "subject_id",
      picks.map((c) => c.id),
    );

  const views = new Map<string, number>();
  for (const row of viewRows ?? []) {
    views.set(row.subject_id as string, (views.get(row.subject_id as string) ?? 0) + (row.n ?? 0));
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-[color:var(--text)]">چند کانال دیگر</h2>
        <Link href="/channels" className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">
          فهرست کامل <ArrowLeft size={13} />
        </Link>
      </div>

      <ul className="divide-y divide-[color:var(--line)] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white">
        {picks.map((c) => {
          const platform = c.platform as ChannelPlatform;
          const Icon = platform === "telegram" ? Send : MessageCircle;
          const state = channelMetricsState(c);
          const n = views.get(c.id as string) ?? 0;
          const verified = channelOwnership(c) === "verified";
          return (
            <li key={c.id}>
              <Link
                href={`/channels/${c.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--bg)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)]">
                  <Icon size={15} className="text-[color:var(--muted-text)]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[color:var(--text)]">
                    {c.title}
                    {verified ? <span className="ms-1 text-emerald-600">✓</span> : null}
                  </span>
                  <span className="block truncate text-xs text-[color:var(--muted-text)]">
                    {CHANNEL_KIND_LABELS_FA[c.kind as ChannelKind]}
                    {c.city ? ` · ${c.city}` : ""}
                    {" · "}
                    {state === "pending" ? CHANNEL_PENDING_FA : CHANNEL_ACTIVITY_LABELS_FA[channelActivity(c)]}
                  </span>
                </span>
                {/* Shown above zero, never at it. */}
                {hasAnyViews(n) ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[color:var(--muted-text)]">
                    <Eye size={12} /> {fa(n)}
                  </span>
                ) : null}
                <ArrowLeft size={13} className="shrink-0 text-[color:var(--muted-text)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

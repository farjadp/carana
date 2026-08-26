// ============================================================================
// Source: components/channels/channel-card.tsx
// Version: 1.0.0 — 2026-08-26
// Why: One card for «کانال‌ها و گروه‌ها», used by the index, the category
//      pages and the home band. Design: docs/15-channels-directory.md.
//
//      The card exists to make one distinction visible at a glance: which of
//      these numbers we measured and which somebody told us. Everything it
//      prints goes through @goplaza/core — memberLineFa() returns null rather
//      than a zero for a row we never checked, and channelActivity() decides
//      «فعال» from last_post_at at read time. No branch here reads `platform`
//      to decide whether a number can be trusted.
// Env / Identity: Server component. No IO.
// ============================================================================
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";

import {
  CHANNEL_ACTIVITY_HINTS_FA,
  CHANNEL_ACTIVITY_LABELS_FA,
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_UNMEASURED_FA,
  channelActivity,
  memberLineFa,
  relativeDayFa,
  type ChannelActivity,
  type ChannelKind,
  type ChannelPlatform,
} from "@goplaza/core";

export type ChannelCardRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: string;
  kind: string;
  city: string | null;
  metrics_source: string;
  member_count: number | null;
  last_post_at: string | null;
  metrics_checked_at: string | null;
};

/** Muted for everything except the two states a reader acts on. */
const ACTIVITY_CLASS: Record<ChannelActivity, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  quiet: "bg-amber-50 text-amber-700 border-amber-200",
  dormant: "bg-[color:var(--bg)] text-[color:var(--muted-text)] border-[color:var(--line)]",
  unknown: "bg-[color:var(--bg)] text-[color:var(--muted-text)] border-[color:var(--line)]",
};

export function ChannelCard({ channel }: { channel: ChannelCardRow }) {
  const platform = channel.platform as ChannelPlatform;
  const activity = channelActivity(channel);
  const members = memberLineFa(channel);
  const lastPost = relativeDayFa(channel.last_post_at);
  const Icon = platform === "telegram" ? Send : MessageCircle;

  return (
    <Link
      href={`/channels/${channel.slug}`}
      className="block rounded-2xl border border-[color:var(--line)] bg-white p-5 transition hover:border-[color:var(--lajvard)] hover:shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]">
            <Icon size={18} className="text-[color:var(--muted-text)]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[color:var(--text)]">{channel.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm leading-7 text-[color:var(--muted-text)]">
              {channel.description}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${ACTIVITY_CLASS[activity]}`}
          title={CHANNEL_ACTIVITY_HINTS_FA[activity]}
        >
          {CHANNEL_ACTIVITY_LABELS_FA[activity]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted-text)]">
        <span>{CHANNEL_KIND_LABELS_FA[channel.kind as ChannelKind]}</span>
        {channel.city ? <span>{channel.city}</span> : null}
        {/* Measured: the number and the day it was taken, together. Never one
            without the other. Unmeasured: words, not a zero and not a dash. */}
        {members ? <span>{members}</span> : <span className="italic">{CHANNEL_UNMEASURED_FA}</span>}
        {lastPost ? <span>آخرین پست: {lastPost}</span> : null}
      </div>
    </Link>
  );
}

/** The columns the card needs, so every caller selects the same set. */
export const CHANNEL_CARD_COLUMNS =
  "id, slug, title, description, platform, kind, city, metrics_source, member_count, last_post_at, metrics_checked_at";

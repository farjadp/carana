// ============================================================================
// Source: packages/core/src/channels.ts
// Version: 1.0.0 — 2026-08-26
// Why: One definition of what a channel entry is, when it counts as alive, and
//      which of its numbers we are allowed to print. The public index, the
//      detail page, the submit form, the admin queue, the metrics cron and
//      (later) mobile must agree, and they only agree if they read this file.
//
//      The axis here is METRICS_SOURCE, not platform. See
//      docs/15-channels-directory.md — plenty of Telegram entries are
//      unmeasurable (preview switched off, invite-link-only) and every
//      WhatsApp row is unmeasurable forever, because there is no API. Code
//      that branches on `platform` to decide whether a number is trustworthy
//      is wrong even when it happens to give the right answer today.
// Env / Identity: Pure. No IO, no Supabase — safe on both server and client.
// ============================================================================

export type ChannelPlatform = "telegram" | "whatsapp";
export type ChannelKind = "channel" | "group";
export type ChannelLanguage = "fa" | "en" | "mixed";
export type ChannelStatus = "pending_moderation" | "published" | "rejected" | "suspended";

/**
 * Where a channel's numbers came from.
 *
 * `measured` — we fetched them ourselves and `metrics_checked_at` says when.
 * `declared` — the submitter typed them and nothing verified anything.
 */
export type MetricsSource = "measured" | "declared";

export const CHANNEL_PLATFORMS: ChannelPlatform[] = ["telegram", "whatsapp"];
export const CHANNEL_KINDS: ChannelKind[] = ["channel", "group"];
export const CHANNEL_LANGUAGES: ChannelLanguage[] = ["fa", "en", "mixed"];

export const CHANNEL_PLATFORM_LABELS_FA: Record<ChannelPlatform, string> = {
  telegram: "تلگرام",
  whatsapp: "واتس‌اپ",
};

export const CHANNEL_KIND_LABELS_FA: Record<ChannelKind, string> = {
  channel: "کانال",
  group: "گروه",
};

export const CHANNEL_LANGUAGE_LABELS_FA: Record<ChannelLanguage, string> = {
  fa: "فارسی",
  en: "انگلیسی",
  mixed: "فارسی و انگلیسی",
};

export const CHANNEL_STATUS_LABELS_FA: Record<ChannelStatus, string> = {
  pending_moderation: "در انتظار بررسی",
  published: "منتشر شده",
  rejected: "رد شده",
  suspended: "معلق",
};

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export type ChannelActivity = "active" | "quiet" | "dormant" | "unknown";

export const CHANNEL_ACTIVE_DAYS = 14;
export const CHANNEL_QUIET_DAYS = 90;

export const CHANNEL_ACTIVITY_LABELS_FA: Record<ChannelActivity, string> = {
  active: "فعال",
  quiet: "کم‌فعال",
  dormant: "راکد",
  // Not "no posts" — we do not know that. We know we could not look.
  unknown: "نامشخص",
};

export const CHANNEL_ACTIVITY_HINTS_FA: Record<ChannelActivity, string> = {
  active: `در ${CHANNEL_ACTIVE_DAYS} روز گذشته پست گذاشته است`,
  quiet: `در ${CHANNEL_QUIET_DAYS} روز گذشته پست گذاشته است`,
  dormant: `بیش از ${CHANNEL_QUIET_DAYS} روز است پستی نگذاشته است`,
  unknown: "آخرین فعالیت این مورد قابل بررسی خودکار نیست",
};

export interface ActivityJudgeableChannel {
  last_post_at?: string | null;
}

/**
 * The one rule for "is this channel alive".
 *
 * Computed from `last_post_at` every time anyone asks — the job_posts rule.
 * There is deliberately no `activity` column and no cron that writes one: a
 * stored verdict is a verdict that can be stale, and staleness is the exact
 * thing this whole section exists to expose.
 *
 * `unknown` is a real answer, not a fallback. Every declared row starts here
 * and most of them stay here, and saying so is the honest alternative to
 * printing a confident "راکد" about something we never looked at.
 */
export function channelActivity(channel: ActivityJudgeableChannel, now = new Date()): ChannelActivity {
  if (!channel.last_post_at) return "unknown";
  const days = (now.getTime() - new Date(channel.last_post_at).getTime()) / 86_400_000;
  if (days <= CHANNEL_ACTIVE_DAYS) return "active";
  if (days <= CHANNEL_QUIET_DAYS) return "quiet";
  return "dormant";
}

/** Sort key for the index. Freshest first; `unknown` sinks below everything dated. */
export function channelFreshnessScore(channel: ActivityJudgeableChannel, now = new Date()): number {
  if (!channel.last_post_at) return -1;
  return new Date(channel.last_post_at).getTime() - now.getTime();
}

// ---------------------------------------------------------------------------
// What we are allowed to print
// ---------------------------------------------------------------------------

export interface MetricJudgeableChannel {
  metrics_source?: string | null;
  member_count?: number | null;
  metrics_checked_at?: string | null;
}

/**
 * May this row's member count be shown as a fact?
 *
 * Both halves are required. A measured row with no `metrics_checked_at` cannot
 * exist — the migration's `channels_measured_has_a_date` CHECK makes it
 * unrepresentable — and this function refuses it anyway, because the day
 * somebody adds a code path that writes the column set by hand, the UI should
 * fail closed rather than print an undated number.
 */
export function hasMeasuredMembers(channel: MetricJudgeableChannel): boolean {
  return (
    channel.metrics_source === "measured" &&
    typeof channel.member_count === "number" &&
    channel.member_count >= 0 &&
    !!channel.metrics_checked_at
  );
}

/**
 * How a view count is allowed to be rendered.
 *
 * Below the floor it is not shown at all. On launch day every entry has four
 * views, and printing that makes the whole section read dead — the same trap
 * as showing «۰ نظر» under a business nobody has reviewed yet. This is not
 * hiding a bad number; it is declining to publish a number that is too small
 * to mean anything.
 */
export const CHANNEL_VIEW_FLOOR = 50;

export function showsViewCount(views: number | null | undefined): boolean {
  return typeof views === "number" && views >= CHANNEL_VIEW_FLOOR;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/**
 * The public Telegram username in a join URL, **lower-cased**, or null.
 *
 * Only `t.me/<name>` counts. `t.me/+abc`, `t.me/joinchat/…` and every WhatsApp
 * URL return null, which is what puts those rows on the `declared` side of the
 * axis: without a public username there is no public page to read.
 *
 * THE LOWER-CASING IS LOAD-BEARING, TWICE. Telegram usernames are
 * case-insensitive, so `t.me/GoPlaza` and `t.me/goplaza` are one channel and
 * the unique index has to see one string. And `channels.tg_username` carries a
 * `^[a-z][a-z0-9_]{3,31}$` CHECK — returning the raw casing made every handle
 * with a capital letter fail its insert with nothing but "ثبت کانال ناموفق
 * بود". Found 26 Aug on the first real submission, which was `t.me/GoPlaza`.
 */
export function telegramUsername(url: string): string | null {
  const m = /^https?:\/\/(?:www\.)?t\.me\/([A-Za-z][A-Za-z0-9_]{3,31})\/?$/.exec((url ?? "").trim());
  return m ? m[1].toLowerCase() : null;
}

const WHATSAPP_INVITE = /^https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{6,}\/?$/;
const WHATSAPP_CHANNEL = /^https?:\/\/whatsapp\.com\/channel\/[A-Za-z0-9]{6,}\/?$/;

/** Does this URL look like something a person can actually join on that platform? */
export function isValidJoinUrl(platform: ChannelPlatform, url: string): boolean {
  const v = (url ?? "").trim();
  if (!v) return false;
  if (platform === "telegram") {
    return (
      telegramUsername(v) !== null ||
      /^https?:\/\/(?:www\.)?t\.me\/\+[A-Za-z0-9_-]{6,}\/?$/.test(v) ||
      /^https?:\/\/(?:www\.)?t\.me\/joinchat\/[A-Za-z0-9_-]{6,}\/?$/.test(v)
    );
  }
  return WHATSAPP_INVITE.test(v) || WHATSAPP_CHANNEL.test(v);
}

/**
 * Whatever somebody actually typed, turned into the one canonical join URL —
 * or null when it cannot be.
 *
 * Nobody types `https://`. They paste `t.me/GoPlaza`, or `@GoPlaza`, or just
 * `GoPlaza`, or the whole URL with a tracking query on the end, and any of
 * those is what they mean. Asking a form to reject four of the five is asking
 * it to be difficult on purpose.
 *
 * Telegram: `@name`, `name`, `t.me/name`, `telegram.me/name` and the full URL
 * all collapse to `https://t.me/<name>` with the name lower-cased; invite
 * forms (`+abc`, `joinchat/abc`) keep their case, because those codes are
 * case-SENSITIVE and lower-casing one would produce a dead link.
 *
 * WhatsApp: a bare invite code is deliberately NOT accepted. There is no way
 * to tell `Kx9fA2` meant for a group from one meant for a channel, and a link
 * we guessed the shape of is a link we cannot stand behind.
 */
export function normalizeJoinUrl(platform: ChannelPlatform, input: string): string | null {
  let v = (input ?? "").trim();
  if (!v) return null;
  // A pasted URL often arrives with a query or a fragment attached.
  v = v.split(/[?#]/)[0].replace(/\/+$/, "");

  if (platform === "telegram") {
    const bare = v
      .replace(/^https?:\/\//i, "")
      .replace(/^(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\//i, "")
      .replace(/^@/, "");
    if (!bare) return null;

    const invite = /^(?:\+|joinchat\/)([A-Za-z0-9_-]{6,})$/.exec(bare);
    if (invite) return `https://t.me/+${invite[1]}`;

    if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(bare)) return `https://t.me/${bare.toLowerCase()}`;
    return null;
  }

  const bare = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const group = /^chat\.whatsapp\.com\/([A-Za-z0-9]{6,})$/.exec(bare);
  if (group) return `https://chat.whatsapp.com/${group[1]}`;
  const channel = /^whatsapp\.com\/channel\/([A-Za-z0-9]{6,})$/.exec(bare);
  if (channel) return `https://whatsapp.com/channel/${channel[1]}`;
  return null;
}

/** What the row's metrics source must be, given only its join URL. */
export function metricsSourceFor(platform: ChannelPlatform, joinUrl: string): MetricsSource {
  return platform === "telegram" && telegramUsername(joinUrl) ? "measured" : "declared";
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * How long a declared row is trusted before its submitter has to say it is
 * still there.
 *
 * A WhatsApp invite link rots and nobody tells us. Measured rows do not carry
 * this at all — the daily check IS the proof, and giving them an expiry too
 * would mean deleting entries we can see are alive.
 */
export const CHANNEL_DECLARED_DAYS = 90;

/** Consecutive failed checks before we stop claiming a number is measured. */
export const CHANNEL_CHECK_FAILURES_MAX = 3;

/** Submissions per user per rolling 24 hours. A rate limit, not a plan quantity. */
export const CHANNELS_PER_DAY = 5;

export const CHANNEL_TITLE_MAX = 80;
export const CHANNEL_DESCRIPTION_MIN = 30;
export const CHANNEL_DESCRIPTION_MAX = 600;

export interface ConfirmableChannel {
  metrics_source?: string | null;
  confirm_by?: string | null;
}

/**
 * Has a declared row outlived its confirmation window?
 *
 * Read-time, like every other expiry in this schema. An unconfirmed row leaves
 * the index; it is never deleted, because the fact that a group existed and
 * went quiet is information too.
 */
export function needsReconfirm(channel: ConfirmableChannel, now = new Date()): boolean {
  if (channel.metrics_source !== "declared") return false;
  if (!channel.confirm_by) return false;
  return new Date(channel.confirm_by) <= now;
}

export interface PublicJudgeableChannel extends ConfirmableChannel {
  status?: string | null;
}

/** The one rule for "does the public see this row". */
export function isChannelPublic(channel: PublicJudgeableChannel, now = new Date()): boolean {
  if (channel.status !== "published") return false;
  return !needsReconfirm(channel, now);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * «۳ روز پیش». Coarse on purpose — nothing here is fresher than the daily
 * cron, so a minute-accurate string would imply a precision we do not have.
 *
 * Lives in core rather than in apps/web because the phrase has to read the
 * same on both surfaces: two implementations would eventually disagree about
 * where "امروز" ends, and the whole section is an argument about dates.
 */
export function relativeDayFa(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days < 0) return "همین حالا";
  if (days === 0) return "امروز";
  if (days === 1) return "دیروز";
  if (days < 30) return `${days.toLocaleString("fa-IR")} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months.toLocaleString("fa-IR")} ماه پیش`;
  return `${Math.floor(months / 12).toLocaleString("fa-IR")} سال پیش`;
}

/**
 * The member line, or null when there is nothing honest to print.
 *
 * Never returns "۰ عضو" for a row we could not measure, and never returns a
 * count without the date it was taken. If this returns null the caller must
 * render the words in CHANNEL_UNMEASURED_FA instead — not a dash, not a zero,
 * and not an empty space where a number was expected.
 */
export function memberLineFa(channel: MetricJudgeableChannel, now = new Date()): string | null {
  if (!hasMeasuredMembers(channel)) return null;
  const checked = relativeDayFa(channel.metrics_checked_at, now);
  const n = (channel.member_count as number).toLocaleString("fa-IR");
  return checked ? `${n} عضو · بررسی‌شده ${checked}` : `${n} عضو`;
}

/** What we say instead of a number we never measured. */
export const CHANNEL_UNMEASURED_FA = "بررسی خودکار برای این مورد ممکن نیست";

/** Why it is not possible, said plainly, per platform. */
export function unmeasurableReasonFa(platform: ChannelPlatform): string {
  return platform === "whatsapp"
    ? "واتس‌اپ راهی برای خواندن تعداد اعضا یا آخرین فعالیت یک گروه در اختیار نمی‌گذارد. آنچه این‌جا می‌بینی را ثبت‌کننده اعلام کرده و هر ۹۰ روز باید دوباره تأییدش کند."
    : "این مورد نام کاربری عمومی ندارد (لینک دعوت است یا پیش‌نمایشش خاموش است)، پس صفحه‌ای برای خواندن وجود ندارد. آنچه این‌جا می‌بینی را ثبت‌کننده اعلام کرده و هر ۹۰ روز باید دوباره تأییدش کند.";
}

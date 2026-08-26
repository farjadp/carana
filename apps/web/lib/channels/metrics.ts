// ============================================================================
// Source: lib/channels/metrics.ts
// Version: 1.0.0 — 2026-08-26
// Why: Read the public preview page of a Telegram channel and keep the four
//      numbers under its card true. Design: docs/15-channels-directory.md.
//
//      WHAT IS READ, AND WHAT IS THROWN AWAY. Title, member count, the
//      timestamp of the most recent post, and how many posts fall inside the
//      last 30 days. THE TEXT OF THE POSTS IS NEVER EXTRACTED, never stored
//      and never rendered — there is not even a column for it. That is the
//      decision that keeps somebody else's scam post off goplaza.ca and lets
//      this section exist without a content-moderation layer we do not have.
//
//      WHY t.me/s/ AND NOT THE BOT API. getChat/getChatMemberCount would need
//      our bot to be an admin of every channel, which nobody is going to do
//      for a directory listing. The preview page is what an anonymous browser
//      already sees. It is also fragile — Telegram owes us nothing and can
//      change this markup any day — so every failure here is absorbed, never
//      thrown, and a channel whose read fails keeps its old numbers until the
//      failure count says stop trusting them.
//
//      A NUMBER WE CANNOT CONFIRM IS NOT SILENTLY KEPT. After
//      CHANNEL_CHECK_FAILURES_MAX consecutive failures the row is demoted to
//      'declared' and the UI stops calling anything about it measured. The
//      alternative — going on printing the last number we happened to see,
//      with a checked-at date that keeps advancing — is exactly the kind of
//      quiet lie this section was built to expose.
// Env / Identity: Server only. No credentials: the page is public.
// ============================================================================

/** How many messages t.me/s/ renders per page. Used to tell a total from a floor. */
const PREVIEW_PAGE_SIZE = 20;

export type ChannelMetrics = {
  title: string | null;
  memberCount: number | null;
  lastPostAt: string | null;
  /**
   * Posts inside the last 30 days, or null when we can only see a floor.
   *
   * The preview page renders a fixed window of recent messages. If every
   * message on it is newer than 30 days, the real count is "at least this
   * many" and we do not know the total — so we publish nothing rather than a
   * number that is quietly wrong for the busiest channels.
   */
  posts30d: number | null;
};

/**
 * Everything we can learn about a public channel from its preview page.
 *
 * Returns null on any failure — network, 404, private channel, preview
 * switched off, or markup we no longer recognise. The caller decides what a
 * failure means; this function does not guess.
 */
export async function readTelegramMetrics(username: string, timeoutMs = 10_000): Promise<ChannelMetrics | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://t.me/s/${encodeURIComponent(username)}`, {
      signal: controller.signal,
      headers: {
        // A plain default UA gets a stripped page. This is not a disguise:
        // the content is public either way.
        "User-Agent": "Mozilla/5.0 (compatible; GoPlazaBot/1.0; +https://goplaza.ca)",
        "Accept-Language": "fa,en;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // A username that does not exist still returns 200 with a generic page.
    if (!html.includes("tgme_channel_info") && !html.includes("tgme_widget_message")) return null;

    return {
      title: parseTitle(html),
      memberCount: parseMembers(html),
      ...parsePostTimes(html),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseTitle(html: string): string | null {
  const m =
    /<div class="tgme_channel_info_header_title"[^>]*>(?:<span[^>]*>)?([^<]+)/.exec(html) ??
    /<meta property="og:title" content="([^"]+)"/.exec(html);
  const title = m ? decodeEntities(m[1]).trim() : "";
  return title || null;
}

function parseMembers(html: string): number | null {
  // The counter block is a pair: a value and the word it counts. Matching the
  // value alone would happily return the photo count on a channel that has no
  // subscriber counter at all.
  const re = /<span class="counter_value">([^<]+)<\/span>\s*<span class="counter_type">([^<]+)<\/span>/g;
  for (const m of html.matchAll(re)) {
    const type = m[2].trim().toLowerCase();
    if (type !== "members" && type !== "subscribers") continue;
    // "12 345", "12,345", "1.2K" — the first two are exact, the third is not,
    // and a rounded number presented as a measurement is not a measurement.
    const raw = m[1].replace(/[\s,  ]/g, "");
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePostTimes(html: string): { lastPostAt: string | null; posts30d: number | null } {
  const times: number[] = [];
  for (const m of html.matchAll(/<time[^>]*datetime="([^"]+)"/g)) {
    const t = Date.parse(m[1]);
    if (Number.isFinite(t)) times.push(t);
  }
  if (!times.length) return { lastPostAt: null, posts30d: null };

  times.sort((a, b) => b - a);
  const cutoff = Date.now() - 30 * 86_400_000;
  const within = times.filter((t) => t >= cutoff).length;

  return {
    lastPostAt: new Date(times[0]).toISOString(),
    // A complete answer only when the window we can see extends past 30 days.
    // Otherwise `within` is a floor, and we say nothing.
    posts30d: times.length >= PREVIEW_PAGE_SIZE && within === times.length ? null : within,
  };
}

/**
 * Has the channel become a different thing since a human approved it?
 *
 * A group renamed after approval is the main abuse route in this section and
 * it is otherwise invisible: the entry keeps its approved description while
 * the destination becomes something else. Compared loosely — casing,
 * whitespace, emoji and decorative punctuation move around constantly without
 * meaning anything, and a queue full of false alarms is a queue that gets
 * ignored.
 */
export function titleChangedMaterially(approved: string, fetched: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      .replace(/[|·•‌\-—_.,!؟?()[\]«»"'`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(approved);
  const b = norm(fetched);
  if (!a || !b) return false;
  if (a === b) return false;
  // One containing the other is a suffix being added or dropped
  // («اخبار تورنتو» → «اخبار تورنتو | رسمی»), not a different channel.
  return !a.includes(b) && !b.includes(a);
}

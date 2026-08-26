// ============================================================================
// Source: lib/blog/syndicate.ts
// Version: 1.0.0 — 2026-08-24
// Why: Push a published post to Telegram and LinkedIn.
//
//      Three rules shaped this file:
//
//      · A channel that is not configured is SKIPPED, never failed. Missing
//        env is not an error, it is "we have not connected that yet" — and it
//        is recorded as `skipped` so the admin sees the truth rather than a
//        red row.
//      · One row per (post, channel) with a unique key in the database is the
//        only thing standing between a retry and a double-post. Nothing here
//        decides "have we posted this already?" from memory.
//      · Nothing is ever posted from a draft. Syndication reads the row and
//        refuses anything whose status is not `published`, because the link
//        it would share would 404 for everyone who is not an admin.
//
//      Connecting a channel:
//        Telegram — talk to @BotFather, create a bot, add it to the channel as
//          an admin with "post messages", then set TELEGRAM_BOT_TOKEN and
//          TELEGRAM_CHANNEL_ID (either -100… or @channelname).
//        LinkedIn — a Community Management API app with w_organization_social,
//          a company-page access token, and the numeric page id:
//          LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORG_ID.
// Env / Identity: Server only. Service role for the ledger.
// ============================================================================
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type Channel = "telegram" | "linkedin";
export const CHANNELS: Channel[] = ["telegram", "linkedin"];

export type SyndicationOutcome = {
  channel: Channel;
  status: "sent" | "failed" | "skipped";
  url?: string;
  externalId?: string;
  error?: string;
};

type PostForShare = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  key_takeaway: string | null;
  cover_url: string | null;
  tags: string[];
  status: string;
};

const postUrl = (slug: string) => `${env.baseUrl}/blog/${slug}`;

/** The shared caption. Persian first, link last, hashtags from the post's own tags. */
function caption(post: PostForShare, limit: number): { text: string; url: string } {
  const url = postUrl(post.slug);
  const lead = (post.excerpt ?? post.key_takeaway ?? "").trim();
  // The blog's `tags` are SEO phrases — "پیدا کردن رستوران ایرانی" — and a
  // phrase does not survive being turned into a hashtag: it reads as noise and
  // nobody ever taps it. Keep the ones short enough to work as a label, cap at
  // three, and print none rather than pad with the long ones.
  const tags = post.tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 24 && t.split(/\s+/).length <= 3)
    .slice(0, 3)
    .map((t) => `#${t.replace(/\s+/g, "_")}`)
    .join(" ");
  const tail = `\n\n${url}${tags ? `\n\n${tags}` : ""}`;
  const room = Math.max(0, limit - tail.length - post.title.length - 2);
  const body = lead.length > room ? `${lead.slice(0, Math.max(0, room - 1)).trimEnd()}…` : lead;
  return { text: `${post.title}\n\n${body}${tail}`.trim(), url };
}

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------
type TgReply = { ok?: boolean; description?: string; result?: { message_id?: number } };

const tgResult = (chat: string, json: TgReply): SyndicationOutcome => {
  const id = json.result?.message_id ? String(json.result.message_id) : undefined;
  const handle = chat.startsWith("@") ? chat.slice(1) : null;
  return { channel: "telegram", status: "sent", externalId: id, url: handle && id ? `https://t.me/${handle}/${id}` : undefined };
};

/** Photos by URL cap at 5 MB on Telegram's side; ours run ~0.5 MB. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Send the cover as bytes rather than as a URL.
 *
 * `sendPhoto` accepts a URL and Telegram fetches it, which is one line of code
 * and one dependency too many: during the first backfill Telegram answered
 * "Bad Request: failed to get HTTP URL content" for a cover that was a
 * perfectly ordinary 1024×576 JPEG of 447 KB, served 200 from the same bucket
 * as the seven covers it had just accepted, and it did so twice in a row. We
 * never learned why, and that is the point — their fetcher is not something we
 * can debug or rely on. Uploading the bytes removes the whole class.
 */
async function sendPhotoBytes(token: string, chat: string, url: string, text: string): Promise<TgReply> {
  const img = await fetch(url);
  if (!img.ok) throw new Error(`cover fetch ${img.status}`);
  const buf = await img.arrayBuffer();
  if (buf.byteLength > MAX_PHOTO_BYTES) throw new Error(`cover too large (${buf.byteLength} bytes)`);

  const form = new FormData();
  form.append("chat_id", chat);
  form.append("caption", text);
  form.append("parse_mode", "HTML");
  form.append("photo", new Blob([buf], { type: img.headers.get("content-type") ?? "image/jpeg" }), "cover.jpg");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: "POST", body: form });
  return (await res.json()) as TgReply;
}

async function sendText(token: string, chat: string, text: string): Promise<TgReply> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", link_preview_options: { prefer_large_media: true } }),
  });
  return (await res.json()) as TgReply;
}

async function toTelegram(post: PostForShare): Promise<SyndicationOutcome> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) return { channel: "telegram", status: "skipped", error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not set" };

  // sendPhoto caps the caption at 1024; sendMessage allows 4096. Size the text
  // for the method we intend to use.
  const withPhoto = Boolean(post.cover_url);
  const { text } = caption(post, withPhoto ? 1000 : 3800);

  try {
    if (withPhoto) {
      try {
        const json = await sendPhotoBytes(token, chat, post.cover_url!, text);
        if (json.ok) return tgResult(chat, json);
        console.warn("blog/telegram: sendPhoto failed, falling back to text —", json.description);
      } catch (e) {
        console.warn("blog/telegram: cover unusable, falling back to text —", e instanceof Error ? e.message : e);
      }
      // An image problem must not cost us the post. Re-caption for the longer
      // limit and send it as a link, which Telegram will preview by itself.
      const { text: longer } = caption(post, 3800);
      const json = await sendText(token, chat, longer);
      if (!json.ok) return { channel: "telegram", status: "failed", error: json.description ?? "sendMessage failed" };
      return tgResult(chat, json);
    }

    const json = await sendText(token, chat, text);
    if (!json.ok) return { channel: "telegram", status: "failed", error: json.description ?? "sendMessage failed" };
    return tgResult(chat, json);
  } catch (e) {
    return { channel: "telegram", status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------
async function toLinkedIn(post: PostForShare): Promise<SyndicationOutcome> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const org = process.env.LINKEDIN_ORG_ID;
  if (!token || !org) return { channel: "linkedin", status: "skipped", error: "LINKEDIN_ACCESS_TOKEN / LINKEDIN_ORG_ID not set" };

  const { text, url } = caption(post, 2800);
  const body = {
    author: `urn:li:organization:${org}`,
    commentary: text,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { article: { source: url, title: post.title.slice(0, 400), description: (post.excerpt ?? "").slice(0, 300) || undefined } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        // LinkedIn versions its API by month and rejects calls without this.
        "LinkedIn-Version": process.env.LINKEDIN_API_VERSION ?? "202508",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { channel: "linkedin", status: "failed", error: `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}` };
    const urn = res.headers.get("x-restli-id") ?? undefined;
    return { channel: "linkedin", status: "sent", externalId: urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}` : undefined };
  } catch (e) {
    return { channel: "linkedin", status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

const SENDERS: Record<Channel, (p: PostForShare) => Promise<SyndicationOutcome>> = { telegram: toTelegram, linkedin: toLinkedIn };

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
/**
 * Share one post to the given channels (all of them by default).
 *
 * Idempotent by construction: a channel already marked `sent` for this post is
 * returned as-is and never re-sent. Pass `force` only to retry a `failed` one.
 */
export async function syndicate(postId: string, opts?: { channels?: Channel[]; force?: boolean }): Promise<SyndicationOutcome[]> {
  const admin = createSupabaseAdminClient();
  const channels = opts?.channels ?? CHANNELS;

  const { data: post } = await admin
    .from("blog_posts")
    .select("id, slug, title, excerpt, key_takeaway, cover_url, tags, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return channels.map((channel) => ({ channel, status: "failed" as const, error: "post not found" }));
  if (post.status !== "published") return channels.map((channel) => ({ channel, status: "skipped" as const, error: "post is not published" }));

  const { data: existing } = await admin.from("blog_syndications").select("channel, status").eq("post_id", postId);
  const already = new Map((existing ?? []).map((r) => [r.channel as Channel, r.status as string]));

  const out: SyndicationOutcome[] = [];
  for (const channel of channels) {
    if (already.get(channel) === "sent" && !opts?.force) {
      out.push({ channel, status: "sent", error: "already sent" });
      continue;
    }
    const r = await SENDERS[channel](post as PostForShare);
    await admin.from("blog_syndications").upsert(
      {
        post_id: postId,
        channel,
        status: r.status,
        external_id: r.externalId ?? null,
        url: r.url ?? null,
        error: r.error ?? null,
        sent_at: r.status === "sent" ? new Date().toISOString() : null,
      },
      { onConflict: "post_id,channel" },
    );
    out.push(r);
  }
  return out;
}

/** Which channels are actually wired up — used to keep the admin UI honest. */
export function configuredChannels(): Channel[] {
  const on: Channel[] = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID) on.push("telegram");
  if (process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ORG_ID) on.push("linkedin");
  return on;
}

export const AUTO_SYNDICATE = process.env.BLOG_SYNDICATE_ON_PUBLISH === "true";

// ---------------------------------------------------------------------------
// Backlog
// ---------------------------------------------------------------------------

/**
 * Telegram throttles a channel at roughly twenty messages a minute and answers
 * 429 with a `retry_after` past that. 3.5 s between sends keeps us under it
 * with room to spare, and — more importantly — it is the difference between a
 * channel that looks published and one that looks dumped.
 */
const DEFAULT_GAP_MS = 3_500;

/** Published posts with no successful send on this channel, oldest first. */
export async function backlogFor(channel: Channel, limit = 500): Promise<{ id: string; slug: string; title: string; published_at: string | null }[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: posts }, { data: sent }] = await Promise.all([
    admin
      .from("blog_posts")
      .select("id, slug, title, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: true })
      .limit(limit),
    admin.from("blog_syndications").select("post_id").eq("channel", channel).eq("status", "sent"),
  ]);
  const done = new Set((sent ?? []).map((r) => r.post_id as string));
  return (posts ?? []).filter((p) => !done.has(p.id));
}

/** How many posts each channel still owes, for the admin desk. */
export async function backlogCounts(): Promise<Record<Channel, number>> {
  const entries = await Promise.all(CHANNELS.map(async (c) => [c, (await backlogFor(c)).length] as const));
  return Object.fromEntries(entries) as Record<Channel, number>;
}

export type BacklogResult = { channel: Channel; sent: number; failed: number; remaining: number; stoppedBecause?: string };

/**
 * Work through the backlog oldest-first, pacing the sends.
 *
 * Oldest first so the channel reads in the order the blog was written rather
 * than backwards. Stops on the first failure instead of grinding through the
 * rest: a failure here is almost always one of two configuration problems —
 * the bot is not an admin of the channel, or the token is wrong — and both
 * would produce the same failure seventy-four times in a row.
 */
export async function syndicateBacklog(channel: Channel, opts?: { limit?: number; gapMs?: number }): Promise<BacklogResult> {
  const limit = Math.max(1, opts?.limit ?? 5);
  const gap = opts?.gapMs ?? DEFAULT_GAP_MS;

  if (!configuredChannels().includes(channel)) {
    return { channel, sent: 0, failed: 0, remaining: (await backlogFor(channel)).length, stoppedBecause: `${channel} is not configured` };
  }

  const queue = await backlogFor(channel);
  const batch = queue.slice(0, limit);
  let sent = 0;
  let failed = 0;
  let stoppedBecause: string | undefined;

  for (const [i, post] of batch.entries()) {
    const [outcome] = await syndicate(post.id, { channels: [channel] });
    if (outcome.status === "sent") sent++;
    else {
      failed++;
      stoppedBecause = `${post.slug}: ${outcome.error ?? outcome.status}`;
      break;
    }
    if (i < batch.length - 1) await new Promise((r) => setTimeout(r, gap));
  }

  return { channel, sent, failed, remaining: queue.length - sent, stoppedBecause };
}

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
  const tags = post.tags
    .slice(0, 4)
    .map((t) => `#${t.trim().replace(/\s+/g, "_")}`)
    .join(" ");
  const tail = `\n\n${url}${tags ? `\n\n${tags}` : ""}`;
  const room = Math.max(0, limit - tail.length - post.title.length - 2);
  const body = lead.length > room ? `${lead.slice(0, Math.max(0, room - 1)).trimEnd()}…` : lead;
  return { text: `${post.title}\n\n${body}${tail}`.trim(), url };
}

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------
async function toTelegram(post: PostForShare): Promise<SyndicationOutcome> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chat) return { channel: "telegram", status: "skipped", error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not set" };

  // sendPhoto caps the caption at 1024; sendMessage allows 4096. Pick the
  // method by whether we actually have an image, and size the text to match.
  const withPhoto = Boolean(post.cover_url);
  const { text } = caption(post, withPhoto ? 1000 : 3800);
  const method = withPhoto ? "sendPhoto" : "sendMessage";
  const payload = withPhoto
    ? { chat_id: chat, photo: post.cover_url, caption: text, parse_mode: "HTML" }
    : { chat_id: chat, text, parse_mode: "HTML", link_preview_options: { prefer_large_media: true } };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } };
    if (!res.ok || !json.ok) return { channel: "telegram", status: "failed", error: json.description ?? `HTTP ${res.status}` };
    const id = json.result?.message_id ? String(json.result.message_id) : undefined;
    const handle = chat.startsWith("@") ? chat.slice(1) : null;
    return { channel: "telegram", status: "sent", externalId: id, url: handle && id ? `https://t.me/${handle}/${id}` : undefined };
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

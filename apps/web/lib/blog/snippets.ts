// ============================================================================
// Source: lib/blog/snippets.ts
// Version: 1.0.0 — 2026-08-26
// Why: The daily card for the Telegram channel.
//
//      A channel that only ever says "new article: <title>, <link>" is a feed,
//      and nobody subscribes to a feed they could have bookmarked. A snippet is
//      the other half: one genuinely interesting thing lifted out of an article
//      we already published, written to stand alone. You should be able to read
//      it, learn something, and never click.
//
//      Three problems had to be solved for this not to become slop:
//
//      1. WHERE THE FACT COMES FROM. Nothing is invented. The writer is handed
//         one published article and must lift something already in it. Then
//         `inventedNumbers()` — the same guard the article pipeline uses —
//         checks every digit in the card against the source post, and a card
//         that introduced one is thrown away rather than sent. This is the
//         whole reason a snippet can be auto-published without a human reading
//         it first.
//
//      2. NOT SAYING THE SAME THING FOREVER. Seven kinds, and the database
//         enforces one kind per article (`unique (source_post_id, kind)`). The
//         picker prefers articles we have never used and kinds we have not run
//         recently, so the channel does not settle into "here is another
//         number" every day.
//
//      3. NOT SOUNDING LIKE A MACHINE. The same voice rules as the blog, plus
//         the ones specific to this format: no greeting, no "در این پست", no
//         call to action beyond the link, and the first line has to earn the
//         second. Telegram is read in a scroll — a card that opens with a
//         throat-clear is a card nobody finishes.
// Env / Identity: Server only. OpenAI + service role + the Telegram sender.
// ============================================================================
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { WRITER_MODEL, inventedNumbers } from "./pipeline";
import { postTelegramText, type SyndicationOutcome } from "./syndicate";

/**
 * Words a card may not introduce on its own.
 *
 * Each turns a measurement into a claim about officialdom. If the source
 * article uses the word, the card may too; if not, the card is reaching past
 * its evidence.
 *
 * Deliberately short. The first version also listed تنها، فقط، بهترین — and
 * they gated nothing, because words that common appear in almost every article,
 * so the "did the source say it too?" test always passed. A gate that never
 * fires is worse than no gate: it reads like coverage. Exclusivity claims are
 * handled by VERIFIED_SCOPE below and by the prompt, not by this list.
 */
const LOADED_WORDS = ["تأیید رسمی", "تایید رسمی", "مجوز", "گواهی", "تضمین", "قانوناً", "موظف"];

/**
 * Words that name a product capability. A card may only use one if its source
 * article did — otherwise it is describing a feature of GOPLAZA that nobody
 * built. A card written today offered readers "فیلتر محصولات" in our search;
 * there is no such filter, and a reader who goes looking for it finds we lied.
 */
const FEATURE_WORDS = ["فیلتر", "ابزار", "قابلیت", "اپلیکیشن", "اپ ", "نقشه", "اعلان", "پنل", "داشبورد", "دسته‌بندی محصولات"];

/**
 * First-person-plural observation claims.
 *
 * The blog allows one "ما در گوپلازا دیده‌ایم…" aside per article, tied to a
 * number from the directory. In a three-sentence card there is no room to tie
 * it to anything, and the model fills the gap with invented customer
 * behaviour — "برخی مشتریان تنها نزدیک‌ترین فروشگاه را انتخاب می‌کنند" is not
 * something a listings table can know. So the card may not claim to have
 * observed anything at all.
 */
const OBSERVATION_CLAIMS = ["دیده‌ایم", "دیده ایم", "مشاهده کرده‌ایم", "متوجه شده‌ایم", "می‌بینیم که"];

export const SNIPPET_KINDS = ["stat", "fun_fact", "tip", "comparison", "mistake", "question", "news"] as const;
export type SnippetKind = (typeof SNIPPET_KINDS)[number];

/**
 * What each kind is for, in the writer's own terms, plus the emoji that opens
 * the card and the Persian label the admin sees.
 *
 * The briefs are written as tests the card must pass rather than topics,
 * because "write a fun fact" produces a fun fact about nothing. "A detail that
 * would make a reader say «نمی‌دانستم»" produces one about something.
 */
export const KIND_SPEC: Record<SnippetKind, { emoji: string; fa: string; brief: string }> = {
  stat: {
    emoji: "📊",
    fa: "آمار جالب",
    brief:
      "One number from the article that is surprising ON ITS OWN, with just enough context to land. Not 'we have N listings' — a number that implies something: a gap, a concentration, a change. Say what it means in one sentence, do not editorialise beyond that.",
  },
  fun_fact: {
    emoji: "💡",
    fa: "دانستنی",
    brief:
      "A concrete detail from the article that would make a reader think «این را نمی‌دانستم». It must be checkable and specific — a rule, a name, a practice, a date. Never a generality dressed up as a discovery.",
  },
  tip: {
    emoji: "🧭",
    fa: "نکتهٔ عملی",
    brief:
      "One thing the reader can actually do, phrased as an instruction they could follow today. It must come from the article's advice, not from general common sense. Concrete enough that a person could get it wrong if they did not know it.",
  },
  comparison: {
    emoji: "⚖️",
    fa: "مقایسه",
    brief:
      "Two figures or two options from the article set against each other, so the contrast does the work. Both sides must be in the article. State the contrast, then one sentence on why it matters.",
  },
  mistake: {
    emoji: "⚠️",
    fa: "اشتباه رایج",
    brief:
      "A mistake the article warns about, what it costs, and what to do instead. No scolding, no fear-mongering — a person who is about to make it should feel informed, not lectured.",
  },
  question: {
    emoji: "❓",
    fa: "پرسش و پاسخ",
    brief:
      "A real question from the article's FAQ, answered in full in two or three sentences. The answer must be complete on its own: someone who reads only this card must not need the article to get the answer.",
  },
  news: {
    emoji: "📰",
    fa: "خبر",
    brief:
      "What changed and who it affects, from an article about something that happened. Only use this kind when the article really is about an event or an announcement; otherwise pick another kind.",
  },
};

// ---------------------------------------------------------------------------
// Picking what to write about
// ---------------------------------------------------------------------------
type SourcePost = {
  id: string;
  slug: string;
  title: string;
  body_md: string;
  key_takeaway: string | null;
  excerpt: string | null;
  faq: { q: string; a: string }[] | null;
  tags: string[];
  category_slug: string | null;
};

/**
 * Choose an article and an angle we have not used together.
 *
 * Preference order is deliberate: an article nobody has drawn from at all
 * beats a second angle on an article we have already mined, and among the
 * kinds still free for that article we take the one used least recently
 * across the whole channel. Both rules push toward variety rather than toward
 * whatever the model finds easiest.
 */
async function pick(alsoTaken: { postId: string; kind: SnippetKind }[] = []): Promise<{ post: SourcePost; kind: SnippetKind } | null> {
  const admin = createSupabaseAdminClient();

  const [{ data: posts }, { data: used }] = await Promise.all([
    admin
      .from("blog_posts")
      .select("id, slug, title, body_md, key_takeaway, excerpt, faq, tags, category_slug")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200),
    admin.from("blog_snippets").select("source_post_id, kind, created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  if (!posts?.length) return null;

  const takenByPost = new Map<string, Set<string>>();
  for (const r of [...(used ?? []), ...alsoTaken.map((p) => ({ source_post_id: p.postId, kind: p.kind }))]) {
    const set = takenByPost.get(r.source_post_id as string) ?? new Set<string>();
    set.add(r.kind as string);
    takenByPost.set(r.source_post_id as string, set);
  }
  // Kinds ordered by how long ago we last used them, least-recent first.
  const lastUsed = new Map<string, number>();
  (used ?? []).forEach((r, i) => {
    if (!lastUsed.has(r.kind as string)) lastUsed.set(r.kind as string, i);
  });
  const kindOrder = [...SNIPPET_KINDS].sort((a, b) => (lastUsed.get(b) ?? 1e9) - (lastUsed.get(a) ?? 1e9));

  const untouched = posts.filter((p) => !takenByPost.has(p.id as string));
  const partially = posts.filter((p) => (takenByPost.get(p.id as string)?.size ?? 0) < SNIPPET_KINDS.length);

  for (const pool of [untouched, partially]) {
    for (const p of pool) {
      const taken = takenByPost.get(p.id as string) ?? new Set<string>();
      // An article with no FAQ cannot answer a question. Nothing else is gated:
      // the writer is allowed to decline a kind that does not fit, and does.
      const faq = (p.faq as { q: string; a: string }[] | null) ?? null;
      const kind = kindOrder.find((k) => !taken.has(k) && (k !== "question" || (faq?.length ?? 0) > 0));
      if (kind) return { post: p as unknown as SourcePost, kind };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------
const snippetSchema = z.object({
  usable: z.boolean().describe("false when this article has nothing worth saying in this format — say so rather than padding"),
  reject_reason: z.string().nullish().transform((v) => v ?? ""),
  hook: z
    .string()
    .nullish()
    .transform((v) => v ?? "")
    .describe("The first line. One short Persian sentence or fragment that makes the second line worth reading. No emoji — one is added. Never a question unless the kind is question. Max 70 characters."),
  body: z
    .string()
    .nullish()
    .transform((v) => v ?? "")
    .describe("Two to four Persian sentences that stand completely on their own. Someone who never opens the article must still have learned the thing."),
  tags: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? [])
    .describe("Up to two short Persian tags, max three words each"),
});

async function write(post: SourcePost, kind: SnippetKind) {
  const spec = KIND_SPEC[kind];
  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: snippetSchema,
    temperature: 0.85,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `You write the Telegram channel of GOPLAZA (گوپلازا), the Persian-language directory of Iranian-owned businesses in Canada.

Write ONE short card, in Persian, of this kind:
${spec.fa} — ${spec.brief}

It is lifted from the article below. Everything in the card must already be in that article: every number, name, place, date and claim. You are choosing and sharpening, never adding. If the article does not contain something worth a card of this kind, set usable: false and say why in one sentence — a weak card is worse than no card, and there are 74 other articles.

SCOPE — the rule that matters most, and the one the first draft of this feature broke:
- A number from GOPLAZA's directory is a fact about OUR LISTINGS, never about Canada. "۳ کسب‌وکار تأییدشده در گوپلازا" is true; "تنها ۳ کسب‌وکار ایرانی کانادا تأیید رسمی دارند" is a different and false claim. Always carry the scope in the sentence: «در گوپلازا ثبت شده», «از کسب‌وکارهایی که در گوپلازا فهرست شده‌اند», «در تورنتو، در فهرست ما».
- Never turn "we have not listed many of X" into "there are not many X".
- The words تأییدشده / verified describe our verification badge only. Never use them as a synonym for "listed", and never imply an official or governmental approval — we are a directory, not a regulator.
- A count of listings is not a count of businesses, a search count is not a demand figure, and a city figure is never a country figure.
- Write the scope in PERSIAN, inside the sentence, as something a person would say. Never splice an English phrase such as "Canada-wide" into a Persian sentence, and never bolt the scope on at the end as a disclaimer.
- Do not open with تنها or فقط before a directory count. Those words make the number an assertion about the world; "در گوپلازا ۳ کسب‌وکار ... " states the same figure honestly.

How it has to read:
- The first line earns the second. Telegram is read in a scroll; a card that opens with a throat-clear is a card nobody finishes.
- No greeting, no "در این پست", no "بیایید", no "آیا می‌دانستید که" as filler, no call to action, and no link — nothing is appended underneath, so the last sentence you write is the last thing the reader sees.
- Two to four sentences, and they must stand alone. The reader is given no link, so anything you leave out is simply lost — never tease, never refer to "the article", never promise more elsewhere. This card is the whole thing.
- Vary sentence length. One short sentence somewhere.
- Written register, plain and direct: می‌رسد not می‌رسه, است not ـه, را not رو. Second-person singular where you address the reader.
- نیم‌فاصله and Persian digits. English proper nouns (Toronto, CRA, RRSP) stay in Latin.
- Never first-person singular. And in a card, never claim to have OBSERVED anything — no "ما در گوپلازا دیده‌ایم", no "متوجه شده‌ایم". A directory of listings knows how many listings it has; it does not know what customers do, prefer or choose. Say what the article says.
- Never describe a GOPLAZA feature the article does not describe. We have search; we do not have product filters, maps, alerts or anything else you might assume a directory has. Offering a reader a feature that does not exist is the worst thing this card can do, because they will go looking for it.
- No hashtags in the text; put them in the tags field.

ARTICLE — ${post.title}
${post.faq?.length ? `\nIts FAQ:\n${post.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}\n` : ""}
---
${post.body_md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").slice(0, 7000)}
---`,
  });
  return object;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The card as it appears in the channel.
 *
 * No link. The card IS the post — it was always written to stand alone, and a
 * "read the full article" line underneath quietly contradicts that: it turns a
 * finished thought into a teaser and invites the reader to feel they were given
 * the short version. Whoever wants the article can find the site.
 *
 * Bold on the hook only — a card with three emphasised things has none.
 */
export function renderSnippet(s: { kind: SnippetKind; hook: string; body: string; tags: string[] }): string {
  const spec = KIND_SPEC[s.kind];
  const tags = s.tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 24 && t.split(/\s+/).length <= 3)
    .slice(0, 2)
    .map((t) => `#${t.replace(/\s+/g, "_")}`)
    .join(" ");
  return [`${spec.emoji} <b>${escapeHtml(s.hook)}</b>`, "", escapeHtml(s.body), tags ? `\n${tags}` : ""].join("\n").trim();
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
export type SnippetResult = {
  created: { id: string; kind: SnippetKind; hook: string; slug: string }[];
  sent: { id: string; url?: string }[];
  skipped: { slug: string; kind: SnippetKind; reason: string }[];
  errors: string[];
};

/**
 * Write `n` cards and, unless told otherwise, send them.
 *
 * Sequential and small by design. Two cards a day is the brief; anything that
 * looks like a batch would undo the reason the article backfill was paced.
 */
export async function generateSnippets(n: number, opts?: { send?: boolean; dryRun?: boolean }): Promise<SnippetResult> {
  const admin = createSupabaseAdminClient();
  const result: SnippetResult = { created: [], sent: [], skipped: [], errors: [] };
  const dryPicks: { postId: string; kind: SnippetKind }[] = [];

  for (let i = 0; i < n; i++) {
    try {
      const choice = await pick(dryPicks);
      if (!choice) {
        result.errors.push("nothing left to write from — every published post has been used for every kind");
        break;
      }
      const { post, kind } = choice;
      const card = await write(post, kind);

      if (!card.usable || !card.hook.trim() || !card.body.trim()) {
        const reason = card.reject_reason || "writer returned an empty card";
        result.skipped.push({ slug: post.slug, kind, reason });
        dryPicks.push({ postId: post.id, kind });
        // Recorded as `skipped` so the unique key stops us re-asking the same
        // question of the same article tomorrow, and so an admin can see that
        // it was tried at all.
        if (!opts?.dryRun) {
          await admin.from("blog_snippets").insert({ source_post_id: post.id, kind, hook: card.hook || "—", body: card.body || "—", status: "skipped", error: reason, ai_model: WRITER_MODEL });
        }
        continue;
      }

      // The honesty gate. A card may only contain digits that are already in
      // the article it came from — this is what makes auto-publishing one
      // defensible without a human reading it first.
      const source = `${post.title}\n${post.body_md}\n${post.key_takeaway ?? ""}\n${post.excerpt ?? ""}\n${(post.faq ?? []).map((f) => `${f.q} ${f.a}`).join("\n")}`;
      const text = `${card.hook}\n${card.body}`;
      const invented = inventedNumbers(source, text);
      if (invented.length) {
        const reason = `invented numbers: ${invented.join(", ")}`;
        result.skipped.push({ slug: post.slug, kind, reason });
        dryPicks.push({ postId: post.id, kind });
        if (!opts?.dryRun) {
          await admin.from("blog_snippets").insert({ source_post_id: post.id, kind, hook: card.hook, body: card.body, status: "skipped", error: reason, ai_model: WRITER_MODEL });
        }
        continue;
      }

      // A card may only use a loaded word if its article already used it. The
      // first sample this feature produced said "تأیید رسمی" about businesses
      // whose article says only that three carry OUR verification badge —
      // a directory metric restated as an official approval. The prompt now
      // forbids it; this makes the forbidding checkable.
      const borrowed = LOADED_WORDS.filter((w) => text.includes(w) && !source.includes(w));

      // The exact shape that got through twice: a verification count stated
      // without saying whose verification it is. "۳ کسب‌وکار تأیید شده‌اند" is
      // a claim about Canada; "۳ کسب‌وکار در گوپلازا نشان تأیید دارند" is a
      // claim about us. A number plus تأیید therefore requires the scope word.
      // Product capabilities the article never mentioned.
      borrowed.push(...FEATURE_WORDS.filter((w) => text.includes(w) && !source.includes(w)).map((w) => `قابلیت «${w.trim()}» در مقاله نیست`));

      // Claims to have observed something. Nothing in a listings table
      // observes customer behaviour, and a card has no room to justify one.
      borrowed.push(...OBSERVATION_CLAIMS.filter((w) => text.includes(w)).map((w) => `ادعای مشاهده («${w}») در کارت مجاز نیست`));

      const claimsVerification = /تأیید|تایید|verified/i.test(text);
      const hasDigits = /[۰-۹0-9]/.test(text);
      const hasScope = /گوپلازا|فهرست ما|در فهرست/.test(text);
      if (claimsVerification && hasDigits && !hasScope) borrowed.push("ادعای تأیید بدون ذکر «گوپلازا»");

      if (borrowed.length) {
        const reason = `words not in the source article: ${borrowed.join("، ")}`;
        result.skipped.push({ slug: post.slug, kind, reason });
        dryPicks.push({ postId: post.id, kind });
        if (!opts?.dryRun) {
          await admin.from("blog_snippets").insert({ source_post_id: post.id, kind, hook: card.hook, body: card.body, status: "skipped", error: reason, ai_model: WRITER_MODEL });
        }
        continue;
      }

      if (opts?.dryRun) {
        result.created.push({ id: "dry-run", kind, hook: card.hook, slug: post.slug });
        // A dry run writes nothing, so pick() has no memory of what it just
        // chose; without this the second card of a two-card dry run is the
        // same angle on the same article.
        dryPicks.push({ postId: post.id, kind });
        continue;
      }

      const { data: row, error } = await admin
        .from("blog_snippets")
        .insert({ source_post_id: post.id, kind, hook: card.hook.trim(), body: card.body.trim(), tags: card.tags, status: "ready", ai_model: WRITER_MODEL })
        .select("id")
        .single();
      if (error) throw error;
      result.created.push({ id: row.id, kind, hook: card.hook, slug: post.slug });

      if (opts?.send !== false) {
        const outcome = await sendSnippet(row.id);
        if (outcome.status === "sent") result.sent.push({ id: row.id, url: outcome.url });
        else result.errors.push(`send ${row.id}: ${outcome.error ?? outcome.status}`);
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return result;
}

/**
 * Send one stored card.
 *
 * Refuses anything already sent, and anything whose article is no longer
 * published: a card is a claim about an article, and a claim with nothing
 * behind it should not be in a channel.
 */
export async function sendSnippet(id: string): Promise<SyndicationOutcome> {
  const admin = createSupabaseAdminClient();
  const { data: snip } = await admin
    .from("blog_snippets")
    .select("id, kind, hook, body, tags, status, source_post_id, blog_posts!inner(slug, status)")
    .eq("id", id)
    .maybeSingle();
  if (!snip) return { channel: "telegram" as const, status: "failed" as const, error: "snippet not found" };
  if (snip.status === "sent") return { channel: "telegram" as const, status: "sent" as const, error: "already sent" };

  const post = snip.blog_posts as unknown as { slug: string; status: string };
  if (post.status !== "published") return { channel: "telegram" as const, status: "skipped" as const, error: "source post is not published" };

  const text = renderSnippet({ kind: snip.kind as SnippetKind, hook: snip.hook, body: snip.body, tags: snip.tags ?? [] });
  const outcome = await postTelegramText(text);

  await admin
    .from("blog_snippets")
    .update({
      status: outcome.status === "sent" ? "sent" : outcome.status === "skipped" ? "ready" : "failed",
      external_id: outcome.externalId ?? null,
      url: outcome.url ?? null,
      error: outcome.error ?? null,
      sent_at: outcome.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  return outcome;
}

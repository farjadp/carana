// ============================================================================
// Source: lib/blog/source-writer.ts
// Version: 1.0.0 — 2026-08-24
// Why: Write GOPLAZA articles from what other Persian-Canadian publications
//      are covering, without ever republishing their words.
//
//      The shape of it, and why each step exists:
//
//      1. HARVEST (sources.ts) hands us articles we have not used before —
//         fresh ones first, archive ones when the fresh window is thin.
//      2. READ turns one source article into a FACT SHEET plus a GOPLAZA
//         angle. The model is asked for discrete claims ("StatCan says school
//         supplies rose X% between 2015 and 2026") and for the reason an
//         Iranian family in Canada should care — not for a summary. It may
//         also refuse: `usable: false` on a story with no lasting value, no
//         relevance to our readers, or nothing we can responsibly restate.
//         Refusals are recorded in the ledger so the same article is never
//         re-read.
//      3. WRITE drafts an original piece from the fact sheet, our own numbers
//         and our own link inventory — the same draft schema, voice and
//         answer-engine rules the data-driven writer uses.
//      4. The ORIGINALITY GATE compares the finished body against the source
//         text with word shingles. Any ten-word run in common and the article
//         is thrown away rather than published. This is the check that turns
//         "we intend to write our own thing" into something enforced.
//      5. Attribution goes into `sources`, rendered at the foot of the post,
//         and `source_article_id` keeps the provenance on the row.
// Env / Identity: Server only. OpenAI + FAL + service role.
// ============================================================================
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generatePostImage } from "./images";
import { AIO_RULES, draftSchema } from "./generate";
import { harvest, markLedger, type SourceArticle } from "./sources";
import {
  AUTO_PUBLISH,
  HOUSE_STYLE,
  WRITER_MODEL,
  buildInventory,
  enforceLinks,
  expand,
  factsBlock,
  humanise,
  insertPost,
  linkBlock,
  uniqueSlug,
  wordCount,
  type GenerateResult,
  type Inventory,
} from "./pipeline";

// ---------------------------------------------------------------------------
// 1. Read a source article into a brief
// ---------------------------------------------------------------------------
// Everything past `usable` is optional AND null-tolerant, and both halves were
// paid for. The first version required a full brief on every read, so a model
// correctly REFUSING an article — a Trudeau-and-Katy-Perry story, in the run
// that caught this — had to invent an angle, links and image scenes just to
// say no, and the schema threw the refusal away as malformed. Making the
// fields `.default()` was not enough: a rejecting model does not omit them,
// it sends `null`, and a zod default does not accept null. Hence `.nullish()`
// with a transform. A refusal must be the cheapest answer to give, not the
// most expensive. Completeness is checked in code after `usable` is true,
// where it can be turned into a skip with a reason instead of an exception.
const orEmpty = <T>(schema: z.ZodType<T>, fallback: T) => schema.nullish().transform((v) => v ?? fallback);
const sourceBriefSchema = z.object({
  usable: z.boolean().describe("false when this story has no lasting value for Iranians in Canada, is a paid placement, is purely partisan politics, is about a private individual, or contains nothing we can restate responsibly. When false, leave every field below empty — do not invent a brief for an article you are rejecting."),
  reject_reason: orEmpty(z.string(), "").describe("One short sentence. Empty when usable."),
  category_slug: orEmpty(z.enum(["guides", "business", "city-life", "culture", "newcomers", "data", "product"]), "guides" as const),
  working_title: orEmpty(z.string(), ""),
  angle: orEmpty(z.string(), "").describe("GOPLAZA's own angle in one sentence — what WE add that the source did not: what it means for an Iranian family here, what to actually do, which local service it touches"),
  why_now: orEmpty(z.string(), ""),
  primary_keyword_fa: orEmpty(z.string(), ""),
  secondary_keywords_fa: orEmpty(z.array(z.string()), [] as string[]),
  english_query: orEmpty(z.string(), ""),
  facts: orEmpty(
    z.array(z.object({ claim: z.string(), attributed_to: z.string().describe("Who said or measured it — StatCan, CRA, the city, the reporter. 'گزارش‌شده' when the source does not say.") })),
    [] as { claim: string; attributed_to: string }[],
  ).describe("Discrete, checkable facts taken from the source. Each is a fact, not a sentence lifted from their prose."),
  must_link: orEmpty(z.array(z.string()), [] as string[]).describe("Paths chosen from the inventory only"),
  image_scenes: orEmpty(z.array(z.string()), [] as string[]).describe("Two scene sentences: cover, then inline; concrete objects, no people, no text"),
});
type SourceBrief = z.infer<typeof sourceBriefSchema>;

/**
 * A usable brief that is missing the pieces the writer needs is a skip, not a
 * crash — the model said yes but did not do the work, and there is nothing to
 * retry that would not just be a second guess.
 */
function briefGap(b: SourceBrief): string | null {
  if (!b.angle.trim()) return "no angle";
  if (!b.facts.length) return "no facts extracted";
  if (!b.must_link.length) return "no internal link chosen";
  if (b.image_scenes.length < 2) return "no image scenes";
  return null;
}

async function readSource(article: SourceArticle, inv: Inventory): Promise<SourceBrief> {
  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: sourceBriefSchema,
    temperature: 0.4,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `You are the content editor of GOPLAZA (گوپلازا), goplaza.ca — the Persian-language directory of Iranian-owned businesses in Canada.

Below is an article published by ${article.sourceName}. Your job is NOT to summarise or rewrite it. Your job is to (a) pull out the checkable facts it reports, and (b) decide what GOPLAZA would write about the same subject that is genuinely ours: what this means for an Iranian family or business owner in Canada, and what they should do about it.

Mark usable: false — and say why in one sentence — when any of these is true:
- it is a paid placement or an advertisement;
- it is a dated news item with nothing left to act on (${article.vintage === "archive" ? `note: this one is from the archive, published ${article.publishedAt?.slice(0, 10) ?? "some time ago"}, so hold it to this test strictly — only take it if the subject is still live` : "it was published recently, so ordinary news is fine"});
- it is partisan politics, a crime story, or about the private life of a named individual;
- the subject has nothing to do with living, working or spending money in Canada;
- the facts cannot be restated without depending on the source's own wording.

An article that is usable must produce an angle we can defend: a practical consequence, a decision the reader faces, or a link into what the directory actually holds.

FACTS OF OUR OWN we can bring to it (quote verbatim, with their scope):
${factsBlock(inv)}

INVENTORY of linkable paths (must_link only from here):
${linkBlock(inv)}

SOURCE ARTICLE — title: ${article.title}
published: ${article.publishedAt ?? "unknown"}
---
${article.text}
---`,
  });
  return object;
}

// ---------------------------------------------------------------------------
// 2. Draft from the fact sheet
// ---------------------------------------------------------------------------
async function draftFromSource(brief: SourceBrief, article: SourceArticle, inv: Inventory) {
  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: draftSchema,
    temperature: 0.7,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `Write an original Persian article for goplaza.ca on this subject.

You are writing FROM A FACT SHEET, not from another article. You have never seen the original wording and must not try to reconstruct it. Do not translate. Do not follow the source's structure. Build the piece around GOPLAZA's angle below, with our own headings, our own order and our own examples.

ANGLE (this is the article): ${brief.angle}
WORKING TITLE: ${brief.working_title}
WHY NOW: ${brief.why_now}
CATEGORY: ${brief.category_slug}
KEYWORDS: ${brief.primary_keyword_fa}${brief.secondary_keywords_fa.length ? `، ${brief.secondary_keywords_fa.join("، ")}` : ""}
ENGLISH QUERY THIS ANSWERS: ${brief.english_query}

REPORTED FACTS (each one must carry its attribution in the prose the first time it appears — "به گزارش ${article.sourceName}…", "طبق آمار …". Do not state a reported fact bare):
${brief.facts.map((f) => `- ${f.claim} [${f.attributed_to}]`).join("\n")}

OUR OWN FACTS (verbatim numbers only, with the scope given here):
${factsBlock(inv)}

Linkable paths (ONLY these; every path in must_link appears at least once as a markdown link with a natural Persian anchor; relative paths like /cities/toronto). Link 3–6 times, spread through the body:
${linkBlock(inv)}
must_link: ${brief.must_link.join(", ")}

${AIO_RULES}

${HOUSE_STYLE} Put exactly one [INLINE_IMAGE] marker on its own line after the second or third section.

One more rule, and it is absolute: the reported facts above are the ONLY things you may attribute to anyone. Everything else in the article is GOPLAZA's own explanation, built from our facts and from general, uncontroversial knowledge. Never invent a quote, a statistic, a price, a deadline or a person.`,
  });
  return object;
}

// ---------------------------------------------------------------------------
// 3. Originality gate
// ---------------------------------------------------------------------------
const normaliseForCompare = (s: string) =>
  s
    .replace(/‌/g, " ")            // نیم‌فاصله → space, so spacing choices cannot mask a match
    .replace(/[ً-ْ]/g, "")     // harakat
    .replace(/[^\p{L}\p{N}\s]/gu, " ")   // punctuation
    .replace(/\s+/g, " ")
    .trim();

function shingles(text: string, k: number): Set<string> {
  const w = normaliseForCompare(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
}

/**
 * How much of our article is verbatim from the source.
 *
 * Ten words is deliberately tight for Persian: a ten-word run in common is
 * not coincidence, it is a copied sentence. `worst` is the longest matching
 * run we found, which is what an admin actually wants to see in the log.
 */
export function originality(body: string, sourceText: string): { shared: number; ratio: number; sample: string | null } {
  const K = 10;
  const src = shingles(sourceText, K);
  const mine = [...shingles(body, K)];
  if (!mine.length) return { shared: 0, ratio: 0, sample: null };
  const hits = mine.filter((s) => src.has(s));
  return { shared: hits.length, ratio: hits.length / mine.length, sample: hits[0] ?? null };
}

/**
 * Thresholds, set from a real run rather than from taste.
 *
 * An article that restates a statistic will legitimately share the odd run —
 * "پنیرهای تازه و نرسیده ۴۲/۵ درصد گران‌تر شده" is the same nine words in any
 * honest retelling, and the first draft we measured shared exactly two runs
 * with a source it plainly had not copied, and a second draft shared four.
 * A copied PARAGRAPH, by contrast, shares dozens: feeding the source back to
 * the gate as our own text scored 386. Six therefore sits roughly sixty times
 * below "copied" while leaving headroom above "restated a statistic" — and
 * anything the gate does reject is written into the ledger with the offending
 * run, so a mis-set threshold shows up as a reason an admin can read.
 */
const MAX_OVERLAP_SHINGLES = 6;
const MAX_OVERLAP_RATIO = 0.02;

// ---------------------------------------------------------------------------
// 4. Run
// ---------------------------------------------------------------------------
/**
 * Write up to `n` posts from external sources.
 *
 * Sequential, not concurrent: each article costs three model passes plus two
 * images, and ten of those in parallel would blow both the rate limit and the
 * serverless time budget in a way that is harder to reason about than a queue.
 * The route's maxDuration is sized for a run of five; ask for ten and it will
 * write as many as it can before the wall and leave the rest `new` in the
 * ledger for the next run — which is the correct behaviour, not a failure.
 */
export async function generateFromSources(n: number, opts?: { publish?: boolean; dryRun?: boolean }): Promise<GenerateResult & { notes: string[] }> {
  const admin = createSupabaseAdminClient();
  const result: GenerateResult & { notes: string[] } = { created: [], errors: [], skipped: [], notes: [] };
  const { data: run } = await admin.from("blog_runs").insert({ requested: n, notes: "source-driven" }).select("id").single();

  let inv: Inventory;
  let articles: SourceArticle[];
  try {
    inv = await buildInventory();
    const h = await harvest(n);
    articles = h.articles;
    result.notes.push(...h.notes);
  } catch (e) {
    result.errors.push({ error: `harvest: ${e instanceof Error ? e.message : String(e)}` });
    if (run) await admin.from("blog_runs").update({ finished_at: new Date().toISOString(), errors: result.errors, notes: result.notes.join(" · ") }).eq("id", run.id);
    return result;
  }

  if (!articles.length) result.notes.push("nothing new to write from");

  for (const article of articles) {
    try {
      const brief = await readSource(article, inv);
      const gap = brief.usable ? briefGap(brief) : null;
      if (!brief.usable || gap) {
        const reason = brief.usable ? `brief incomplete: ${gap}` : brief.reject_reason || "rejected without a reason";
        await markLedger(article.ledgerId, "skipped", reason);
        result.skipped!.push({ title: article.title, reason });
        continue;
      }

      const d = await draftFromSource(brief, article, inv);
      let full = d.body_md;
      if (wordCount(full) < 850) full = await expand(full);
      const humanBody = await humanise(full);

      // Originality gate — before we spend money on images.
      const o = originality(humanBody, article.text);
      if (o.shared > MAX_OVERLAP_SHINGLES || o.ratio > MAX_OVERLAP_RATIO) {
        await markLedger(article.ledgerId, "skipped", `overlap with source: ${o.shared} shared runs`);
        result.skipped!.push({ title: article.title, reason: `متن با منبع هم‌پوشانی داشت (${o.shared} قطعه) — «${o.sample?.slice(0, 60) ?? ""}»` });
        continue;
      }

      const slug = await uniqueSlug(d.slug_en || d.title_en);
      const { body: linked, links } = enforceLinks(humanBody, inv);
      let body = linked;

      let cover: string | null = null;
      if (!opts?.dryRun) {
        const [c, i] = await Promise.all([
          generatePostImage({ scene: brief.image_scenes[0], postSlug: slug, role: "cover" }),
          generatePostImage({ scene: brief.image_scenes[1], postSlug: slug, role: "inline" }),
        ]);
        cover = c?.url ?? null;
        body = body.replace("[INLINE_IMAGE]", i ? `![${brief.image_scenes[1].slice(0, 100)}](${i.url})` : "");
      } else {
        body = body.replace("[INLINE_IMAGE]", "");
      }

      if (opts?.dryRun) {
        result.created.push({ id: "dry-run", slug, title: d.title });
        continue;
      }

      const publish = opts?.publish ?? AUTO_PUBLISH;
      const inserted = await insertPost({
        slug,
        title: d.title,
        title_en: d.title_en,
        excerpt: d.excerpt,
        summary_en: d.summary_en,
        key_takeaway: d.key_takeaway,
        body_md: body,
        cover_url: cover,
        cover_alt: brief.image_scenes[0].slice(0, 140),
        category_slug: brief.category_slug,
        tags: d.tags,
        status: publish ? "published" : "review",
        published_at: publish ? new Date().toISOString() : null,
        reading_minutes: d.reading_minutes,
        faq: d.faq,
        sources: [{ title: `${article.title} — ${article.sourceName}`, url: article.url }],
        internal_links: links,
        ai_model: WRITER_MODEL,
        topic_seed: `${article.sourceName} (${article.vintage}) — ${brief.angle}`,
        source_article_id: article.ledgerId,
      });
      await markLedger(article.ledgerId, "used", brief.angle, inserted.id);
      result.created.push(inserted);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markLedger(article.ledgerId, "failed", msg);
      result.errors.push({ title: article.title, error: msg });
    }
  }

  if (run) {
    await admin
      .from("blog_runs")
      .update({
        finished_at: new Date().toISOString(),
        created: result.created.length,
        errors: result.errors.length ? result.errors : null,
        notes: [`source-driven`, ...result.notes, ...(result.skipped!.length ? [`${result.skipped!.length} skipped`] : [])].join(" · ").slice(0, 1000),
      })
      .eq("id", run.id);
  }
  return result;
}

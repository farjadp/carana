// ============================================================================
// Source: lib/blog/generate.ts
// Version: 2.0.0 — 2026-08-24
// Why: The data-driven half of the article pipeline: topic → brief → draft →
//      humanise → images → internal links → row in `blog_posts`.
//
//      Topics come from the directory, not from a keyword list: category
//      rotation, cities with real counts, zero-result searches, suggestions,
//      and the calendar. That is what keeps this from being "scaled content
//      abuse" — every post is anchored to something only GOPLAZA knows.
//
//      v2 — the inventory, the voice, link enforcement, the slug and the
//      insert moved to pipeline.ts so the source-driven writer
//      (source-writer.ts) shares them. What is left here is topic selection
//      and the draft prompt. The draft now also produces `key_takeaway`, the
//      40–60-word block an answer engine can quote whole.
// Env / Identity: Server only. OpenAI + FAL + service role.
// ============================================================================
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generatePostImage } from "./images";
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

export type { GenerateResult } from "./pipeline";

// ---------------------------------------------------------------------------
// 1. Topic selection — anchored to data + calendar, avoiding what we already wrote
// ---------------------------------------------------------------------------
const CATEGORY_ROTATION = ["guides", "business", "city-life", "culture", "newcomers", "data", "guides"];

export function seasonalHooks(now = new Date()) {
  const m = now.getMonth() + 1; // 1..12
  const hooks: string[] = [];
  if (m === 3) hooks.push("نوروز و سفره‌ی هفت‌سین در کانادا", "خانه‌تکانی و خدمات نظافت");
  if (m === 12) hooks.push("شب یلدا در تورنتو و ونکوور", "خرید انار و هندوانه");
  if (m === 9 || m === 10) hooks.push("مهرگان", "شروع مدرسه و کلاس زبان فارسی");
  if (m === 2 || m === 3 || m === 4) hooks.push("فصل مالیات کانادا (T1، RRSP، TFSA)");
  if (m === 5 || m === 6) hooks.push("فصل نقل‌مکان و اجاره", "بازار خانه در بهار");
  if (m === 11 || m === 12 || m === 1) hooks.push("زمستان اول در کانادا", "لاستیک زمستانی");
  if (m === 7 || m === 8) hooks.push("تابستان: کباب، پیک‌نیک، رویدادهای ایرانی");
  return hooks;
}

const briefSchema = z.object({
  category_slug: z.enum(["guides", "business", "city-life", "culture", "newcomers", "data", "product"]),
  working_title: z.string(),
  angle: z.string().describe("The one specific, non-generic angle in one sentence"),
  why_now: z.string().describe("Which data point or date makes this worth writing today"),
  primary_keyword_fa: z.string(),
  secondary_keywords_fa: z.array(z.string()),
  english_query: z.string().describe("The English question a Canadian would type that this answers"),
  must_link: z.array(z.string()).min(1).describe("Paths chosen from the inventory only"),
  numbers_to_use: z.array(z.string()).describe("Verbatim facts from the FACTS list; nothing invented"),
  image_scenes: z.array(z.string()).min(2).describe("Two scene sentences: cover, then inline; concrete objects, no people"),
});
export type Brief = z.infer<typeof briefSchema>;

async function planTopics(n: number, inv: Inventory) {
  const admin = createSupabaseAdminClient();
  const { data: recent } = await admin.from("blog_posts").select("title, category_slug, tags").order("created_at", { ascending: false }).limit(60);
  const recentTitles = (recent ?? []).map((r) => `- [${r.category_slug}] ${r.title}`).join("\n") || "(هیچ)";
  const catCounts = new Map<string, number>();
  for (const r of recent ?? []) catCounts.set(String(r.category_slug), (catCounts.get(String(r.category_slug)) ?? 0) + 1);
  const wanted = CATEGORY_ROTATION.slice().sort((a, b) => (catCounts.get(a) ?? 0) - (catCounts.get(b) ?? 0)).slice(0, n);

  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: z.object({ briefs: z.array(briefSchema).min(1) }),
    temperature: 0.8,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `You are the content editor of GOPLAZA (گوپلازا), the Persian-language directory of Iranian-owned businesses in Canada (goplaza.ca). Plan ${n} article briefs for today.

Editorial line: useful, specific, grounded in the directory's own data. Never generic listicles ("10 tips…"). Each brief answers a real question an Iranian in Canada has, and links to real pages on the site.
Prefer these categories today (least recently covered): ${wanted.join(", ")}.
Today: ${new Date().toISOString().slice(0, 10)}. Seasonal hooks: ${seasonalHooks().join("، ") || "none"}.

FACTS (only these numbers may be used; quote verbatim, WITH THEIR SCOPE — never attribute a Canada-wide number to a city):
${factsBlock(inv)}

DEMAND (what people searched and did not find, last 30 days): ${inv.zeroTop.join("؛ ") || "—"}
SUGGESTIONS (what people asked us for): ${inv.suggestions.join("؛ ") || "—"}

INVENTORY of linkable paths (must_link only from here):
${linkBlock(inv)}

Already written (do not repeat, do not paraphrase):
${recentTitles}

Rules: working titles are statements or how-tos, not rhetorical questions, ≤ 70 characters, specific (a city or a number in it when possible); each brief must have a distinct angle; at least two of the ${n} must be tied to a DEMAND or SUGGESTION item; at least one must be a city-specific piece; image scenes follow this photographic style: one object, warm cream, no people, no text.`,
  });
  return object.briefs.slice(0, n);
}

// ---------------------------------------------------------------------------
// 2. Draft
// ---------------------------------------------------------------------------
export const draftSchema = z.object({
  title: z.string().describe("Statement or how-to, ≤ 70 chars, no rhetorical question, no colon-subtitle"),
  title_en: z.string(),
  slug_en: z.string().describe("kebab-case ASCII slug from the English title, max 60 chars"),
  excerpt: z.string().describe("One or two Persian sentences, no clickbait"),
  key_takeaway: z
    .string()
    .describe("40–60 Persian words that answer the article's central question OUTRIGHT and standalone — no 'in this article', no pronouns referring to the title. This is the passage an answer engine quotes."),
  summary_en: z.string().describe("2–3 English sentences an answer engine can quote; include one number from FACTS with its scope; say 'listed' not 'verified' unless quoting the verified count; no site paths"),
  body_md: z.string().describe("Persian markdown, 1000–1400 words, 4–6 ## headings (not more), at least one GFM table where a comparison exists, [INLINE_IMAGE] marker once, internal links as markdown to inventory paths, no H1"),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).min(2),
  tags: z.array(z.string()).min(1),
  reading_minutes: z.number(),
});

/** Rules that make an article quotable by answer engines, not just rankable. */
export const AIO_RULES = `Answer-engine rules (AIO/GEO) — follow all of them:
- Every ## heading is a question a person would actually type, or a plain noun phrase; the first two sentences under it answer that heading completely on their own, before any context. A section that only makes sense after reading the previous one cannot be quoted.
- Include at least one GFM markdown table when the topic contains anything comparable — options, costs, provinces, documents, timelines, before/after. Header row plus 3–6 rows, first column the thing being compared, no empty cells, no cell longer than a short phrase. Do not fabricate a table for a topic with nothing to compare.
- State entities in full at least once: "سازمان مالیاتی کانادا (CRA)", "اداره مهاجرت کانادا (IRCC)", city names with their province on first mention.
- Attach a date or a period to anything time-sensitive ("از ژانویه ۲۰۲۶", "در سال تحصیلی جاری") so a stale claim is visibly stale.
- Never state a statistic, price, law, deadline or business name that was not given to you in this prompt. If a number would help but you were not given it, describe the shape without inventing the figure.`;

async function draft(brief: Brief, inv: Inventory) {
  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: draftSchema,
    temperature: 0.7,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `Write the article for this brief, in Persian, for goplaza.ca.

BRIEF: ${JSON.stringify(brief, null, 2)}

FACTS you may quote (verbatim numbers only, with the scope given here; if a number is not here, do not state one):
${factsBlock(inv)}

Linkable paths (use ONLY these for internal links; every path in brief.must_link must appear at least once as a markdown link with a natural Persian anchor, and paths must be relative like /categories/medical-clinic). Link 3–6 times in total, spread through the body, never two links in one sentence:
${linkBlock(inv)}

${AIO_RULES}

${HOUSE_STYLE} Put exactly one [INLINE_IMAGE] marker on its own line after the second or third section.`,
  });
  return object;
}

// ---------------------------------------------------------------------------
// 3. Run
// ---------------------------------------------------------------------------
/** Generate `n` posts from our own data. Each brief is independent; one failure does not stop the run. */
export async function generatePosts(n: number, opts?: { publish?: boolean; dryRun?: boolean }): Promise<GenerateResult> {
  const admin = createSupabaseAdminClient();
  const result: GenerateResult = { created: [], errors: [] };
  const { data: run } = await admin.from("blog_runs").insert({ requested: n, notes: "data-driven" }).select("id").single();

  let inv: Inventory;
  let briefs: Brief[];
  try {
    inv = await buildInventory();
    briefs = await planTopics(n, inv);
  } catch (e) {
    result.errors.push({ error: `plan: ${e instanceof Error ? e.message : String(e)}` });
    if (run) await admin.from("blog_runs").update({ finished_at: new Date().toISOString(), errors: result.errors }).eq("id", run.id);
    return result;
  }

  // Posts are independent; run them concurrently so five fit inside one
  // serverless invocation (each is ~25–40 s of model + image time).
  const writeOne = async (brief: Brief) => {
    try {
      const d = await draft(brief, inv);
      let full = d.body_md;
      if (wordCount(full) < 850) full = await expand(full);
      const humanBody = await humanise(full);
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

      const publish = opts?.publish ?? AUTO_PUBLISH;
      if (opts?.dryRun) {
        result.created.push({ id: "dry-run", slug, title: d.title });
        return;
      }
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
        sources: null,
        internal_links: links,
        ai_model: WRITER_MODEL,
        topic_seed: `${brief.why_now} — ${brief.angle}`,
      });
      result.created.push(inserted);
    } catch (e) {
      result.errors.push({ title: brief.working_title, error: e instanceof Error ? e.message : String(e) });
    }
  };
  await Promise.all(briefs.map(writeOne));

  if (run) await admin.from("blog_runs").update({ finished_at: new Date().toISOString(), created: result.created.length, errors: result.errors.length ? result.errors : null }).eq("id", run.id);
  return result;
}

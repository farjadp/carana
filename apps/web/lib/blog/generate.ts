// ============================================================================
// Source: lib/blog/generate.ts
// Version: 1.0.0 — 2026-08-16
// Why: The article pipeline. Topic → brief → draft → humanise → images →
//      internal links → row in `blog_posts` (status `review`, or `published`
//      when BLOG_AUTO_PUBLISH=true).
//
//      Design choices, and why:
//      - Topics come from the directory, not from a keyword list: category
//        rotation, cities with real counts, zero-result searches, suggestions,
//        and the calendar. That is what keeps this from being "scaled content
//        abuse" — every post is anchored to something only GOPLAZA knows.
//      - Two model passes. The first writes with structure (JSON); the second
//        rewrites the prose in a specific human voice with concrete rules
//        (short/long rhythm, no listicle tics, first-person plural, one
//        opinion). Humanised output is measurably less templated.
//      - Internal links are not asked for as free text. The writer picks from
//        an inventory of real paths we hand it, and we verify each one exists
//        before publishing. A blog that 404s inside itself is worse than none.
//      - Every claim of a number must be one we passed in. The prompt says so,
//        and the summary block at the top of each post is rendered from the
//        same numbers, so the article cannot drift from the site.
// Env / Identity: Server only. OpenAI + FAL + service role.
// ============================================================================
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { PUBLIC_STATUSES } from "@goplaza/core";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { cityConfigs } from "@/lib/data/cities";
import { slugify } from "@goplaza/core";
import { MIN_INDEXABLE, countCategoryCities } from "@/lib/seo/local";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { generatePostImage } from "./images";

const WRITER_MODEL = process.env.BLOG_MODEL ?? "gpt-4.1";
const AUTO_PUBLISH = process.env.BLOG_AUTO_PUBLISH === "true";

// ---------------------------------------------------------------------------
// 1. Inventory — what the writer may link to and quote
// ---------------------------------------------------------------------------
type LinkTarget = { path: string; label: string; kind: "category" | "city" | "local" | "business" | "page" };

async function buildInventory() {
  const admin = createSupabaseAdminClient();
  const targets: LinkTarget[] = [
    { path: "/search", label: "جستجوی گوپلازا", kind: "page" },
    { path: "/how-it-works", label: "چطور کار می‌کند", kind: "page" },
    { path: "/trust", label: "نشان تأیید چیست", kind: "page" },
    { path: "/dashboard/business/new", label: "ثبت رایگان کسب‌وکار", kind: "page" },
    { path: "/download", label: "دانلود اپ گوپلازا", kind: "page" },
    { path: "/blog", label: "وبلاگ گوپلازا", kind: "page" },
  ];
  for (const c of Object.values(CATEGORY_DETAILS)) targets.push({ path: `/categories/${c.slug}`, label: c.name, kind: "category" });
  for (const c of cityConfigs) targets.push({ path: `/cities/${c.slug}`, label: `کسب‌وکارهای ایرانی ${c.nameFa}`, kind: "city" });

  // City × category pages that are indexable, with counts (the writer quotes these).
  const localFacts: { path: string; label: string; count: number }[] = [];
  for (const cat of Object.values(CATEGORY_DETAILS)) {
    const perCity = await countCategoryCities(admin, cat.slug, cat.name);
    for (const { city, count } of perCity) {
      if (count >= MIN_INDEXABLE) {
        localFacts.push({ path: `/cities/${city.slug}/${cat.slug}`, label: `${cat.name} در ${city.nameFa}`, count });
        targets.push({ path: `/cities/${city.slug}/${cat.slug}`, label: `${cat.name} در ${city.nameFa} (${count})`, kind: "local" });
      }
    }
  }

  // A handful of verified businesses — real names the writer may mention.
  const { data: verified } = await admin
    .from("businesses")
    .select("slug, name, category, city")
    .in("status", PUBLIC_STATUSES)
    .gt("verified_until", new Date().toISOString())
    .limit(20);
  for (const b of verified ?? []) if (b.slug) targets.push({ path: `/businesses/${b.slug}`, label: `${b.name} (${b.city ?? ""})`, kind: "business" });

  // Site-wide numbers.
  const [{ count: total }, { count: verifiedCount }] = await Promise.all([
    admin.from("businesses").select("id", { count: "exact", head: true }).in("status", PUBLIC_STATUSES),
    admin.from("businesses").select("id", { count: "exact", head: true }).in("status", PUBLIC_STATUSES).gt("verified_until", new Date().toISOString()),
  ]);

  // Demand signals: zero-result searches (last 30 days) and recent suggestions.
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: zero }, { data: sugg }] = await Promise.all([
    admin.from("search_queries").select("q, city").eq("result_count", 0).gte("created_at", since).limit(200),
    admin.from("suggestions").select("body").not("body", "is", null).gte("created_at", since).limit(50),
  ]);
  const zeroFreq = new Map<string, number>();
  for (const r of zero ?? []) { const k = String(r.q).trim(); if (k.length > 2) zeroFreq.set(k, (zeroFreq.get(k) ?? 0) + 1); }
  const zeroTop = [...zeroFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([q, n]) => `${q} (${n})`);

  return {
    targets,
    localFacts: localFacts.sort((a, b) => b.count - a.count).slice(0, 40),
    total: total ?? 0,
    verified: verifiedCount ?? 0,
    zeroTop,
    suggestions: (sugg ?? []).map((s) => String(s.body).slice(0, 120)).slice(0, 15),
  };
}

// ---------------------------------------------------------------------------
// 2. Topic selection — anchored to data + calendar, avoiding what we already wrote
// ---------------------------------------------------------------------------
const CATEGORY_ROTATION = ["guides", "business", "city-life", "culture", "newcomers", "data", "guides"];

function seasonalHooks(now = new Date()) {
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

async function planTopics(n: number, inv: Awaited<ReturnType<typeof buildInventory>>) {
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
- Canada-wide, all cities: ${inv.total} public listings; ${inv.verified} verified (Canada-wide)
${inv.localFacts.map((f) => `- ${f.label}: ${f.count} → ${f.path}`).join("\n")}

DEMAND (what people searched and did not find, last 30 days): ${inv.zeroTop.join("؛ ") || "—"}
SUGGESTIONS (what people asked us for): ${inv.suggestions.join("؛ ") || "—"}

INVENTORY of linkable paths (must_link only from here):
${inv.targets.map((t) => `${t.path} — ${t.label}`).join("\n")}

Already written (do not repeat, do not paraphrase):
${recentTitles}

Rules: working titles are statements or how-tos, not rhetorical questions, ≤ 70 characters, specific (a city or a number in it when possible); each brief must have a distinct angle; at least two of the ${n} must be tied to a DEMAND or SUGGESTION item; at least one must be a city-specific piece; image scenes follow this photographic style: one object, warm cream, no people, no text.`,
  });
  return object.briefs.slice(0, n);
}

// ---------------------------------------------------------------------------
// 3. Draft → humanise
// ---------------------------------------------------------------------------
const draftSchema = z.object({
  title: z.string().describe("Statement or how-to, ≤ 70 chars, no rhetorical question, no colon-subtitle"),
  title_en: z.string(),
  slug_en: z.string().describe("kebab-case ASCII slug from the English title, max 60 chars"),
  excerpt: z.string().describe("One or two Persian sentences, no clickbait"),
  summary_en: z.string().describe("2–3 English sentences an answer engine can quote; include one number from FACTS with its scope; say 'listed' not 'verified' unless quoting the verified count; no site paths"),
  body_md: z.string().describe("Persian markdown, 1000–1400 words, 4–6 ## headings (not more), one table or list where it helps, [INLINE_IMAGE] marker once, internal links as markdown to inventory paths, no H1"),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).min(2),
  tags: z.array(z.string()).min(1),
  reading_minutes: z.number(),
});

async function draft(brief: z.infer<typeof briefSchema>, inv: Awaited<ReturnType<typeof buildInventory>>) {
  const { object } = await generateObject({
    model: openai(WRITER_MODEL),
    schema: draftSchema,
    temperature: 0.7,
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `Write the article for this brief, in Persian, for goplaza.ca.

BRIEF: ${JSON.stringify(brief, null, 2)}

FACTS you may quote (verbatim numbers only, with the scope given here; if a number is not here, do not state one). Canada-wide across all cities: ${inv.total} listings, ${inv.verified} verified. Per city×category (these are city-scoped):
${inv.localFacts.map((f) => `${f.label}: ${f.count} (${f.path})`).join("; ")}

Linkable paths (use ONLY these for internal links; every path in brief.must_link must appear at least once as a markdown link with a natural Persian anchor, and paths must be relative like /categories/medical-clinic):
${inv.targets.map((t) => `${t.path} — ${t.label}`).join("\n")}

Style: expert but plain; second-person singular خودمانی ("پیدا کن", "بپرس"); never first-person singular ("من", "خودم") and never invented personal anecdotes — the only first person allowed is "ما در گوپلازا" about the directory's data; written register, not spoken (می‌رسد not می‌رسه, است not ـه، را not رو); GOPLAZA launched in 2026 — never "سال‌ها" or "همیشه" about our own experience; the word "تأییدشده/verified" only for the verified count itself, never as a synonym for "listed"; nim-fasele (نیم‌فاصله) always; Persian digits inside Persian text; keep English proper nouns (city names, RRSP, TFSA, T1) in Latin; no "در این مقاله"; no filler intro; open with the reader's situation in two sentences; end with a short "بعدش چه کار کنم" section that points to the site. Put exactly one [INLINE_IMAGE] marker on its own line after the second or third section. Do not invent statistics, prices, laws or names. Where a rule depends on province, say "در انتاریو…" explicitly and keep it general.`,
  });
  return object;
}

const wordCount = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").split(/\s+/).filter(Boolean).length;

/** If a draft comes out short, grow it with substance — examples, a table, a checklist — never filler. */
async function expand(body: string, target = 1100): Promise<string> {
  const { text } = await generateText({
    model: openai(WRITER_MODEL),
    temperature: 0.7,
    prompt: `This Persian article is ${wordCount(body)} words; it should be about ${target}. Expand it to roughly ${target} words by adding SUBSTANCE only: a concrete example under each thin section, one comparison table or checklist where it helps, a short "اشتباه‌های رایج" section if there is none. Keep every existing heading, fact, number, link and the [INLINE_IMAGE] marker exactly. Do not add filler sentences, do not add an intro or a conclusion paragraph, do not invent statistics, prices, laws or business names. Keep نیم‌فاصله and Persian digits. Return only the markdown.

ARTICLE:
${body}`,
  });
  return text.trim();
}

async function humanise(body: string): Promise<string> {
  const { text } = await generateText({
    model: openai(WRITER_MODEL),
    temperature: 0.9,
    prompt: `Rewrite the following Persian article so it reads as written by one experienced person, not a template. Keep every fact, number, heading, link, table and the [INLINE_IMAGE] marker exactly; do not add or remove sections; keep the total length within 10% of the original (do not compress — expand a thin paragraph with a concrete example instead). Change the prose:

- Vary sentence length: some very short. Some longer, with a clause that adds a concrete detail.
- Remove listicle tics and AI-isms: no "در دنیای امروز", "قابل توجه است که", "به طور کلی", "در نهایت", "بیایید", "مهم است بدانید"; no sentence that starts with "این" three times in a row; no bullet list longer than five items.
- One place, allow an aside in first-person plural ("ما در گوپلازا دیده‌ایم که…") tied to the directory's data. Never first-person singular, never an invented personal memory.
- One place, take a position ("به نظر ما…") and give the reason.
- Prefer verbs to nominalisations; cut adverbs.
- Keep the written register: no spoken/broken forms (می‌رسه، می‌شه، رو، تو به‌جای در) — خودمانی means plain and direct, not colloquial spelling.
- Keep نیم‌فاصله and Persian digits. Return only the markdown.

ARTICLE:
${body}`,
  });
  return text.trim();
}

// ---------------------------------------------------------------------------
// 4. Link verification, images, persist
// ---------------------------------------------------------------------------
function extractInternalLinks(md: string): string[] {
  const out = new Set<string>();
  for (const m of md.matchAll(/\]\((\/[^)\s#?]+)/g)) out.add(m[1]);
  return [...out];
}

async function verifyPaths(paths: string[], inv: Awaited<ReturnType<typeof buildInventory>>) {
  const known = new Set(inv.targets.map((t) => t.path));
  return paths.filter((p) => known.has(p));
}

async function uniqueSlug(base: string) {
  const admin = createSupabaseAdminClient();
  let slug = slugify(base).slice(0, 70) || `post-${Date.now()}`;
  const { data } = await admin.from("blog_posts").select("slug").like("slug", `${slug}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

export type GenerateResult = { created: { id: string; slug: string; title: string }[]; errors: { title?: string; error: string }[] };

/** Generate `n` posts. Each brief is independent; one failure does not stop the run. */
export async function generatePosts(n: number, opts?: { publish?: boolean; dryRun?: boolean }): Promise<GenerateResult> {
  const admin = createSupabaseAdminClient();
  const result: GenerateResult = { created: [], errors: [] };
  const { data: run } = await admin.from("blog_runs").insert({ requested: n }).select("id").single();

  let inv: Awaited<ReturnType<typeof buildInventory>>;
  let briefs: z.infer<typeof briefSchema>[];
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
  const writeOne = async (brief: z.infer<typeof briefSchema>) => {
    try {
      const d = await draft(brief, inv);
      let full = d.body_md;
      if (wordCount(full) < 850) full = await expand(full);
      const humanBody = await humanise(full);
      const slug = await uniqueSlug(d.slug_en || d.title_en);

      // Links: only ones that exist. Strip the rest to plain text.
      const wanted = extractInternalLinks(humanBody);
      const ok = new Set(await verifyPaths(wanted, inv));
      let body = humanBody.replace(/\[([^\]]+)\]\((\/[^)\s#?]+)[^)]*\)/g, (m, text, path) => (ok.has(path) ? m : text));

      // Images
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
      const row = {
        slug,
        title: d.title,
        title_en: d.title_en,
        excerpt: d.excerpt,
        summary_en: d.summary_en,
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
        internal_links: [...ok],
        ai_model: WRITER_MODEL,
        topic_seed: `${brief.why_now} — ${brief.angle}`,
      };
      if (opts?.dryRun) {
        result.created.push({ id: "dry-run", slug, title: d.title });
        return;
      }
      const { data: inserted, error } = await admin.from("blog_posts").insert(row).select("id, slug, title").single();
      if (error) throw error;
      result.created.push(inserted);
    } catch (e) {
      result.errors.push({ title: brief.working_title, error: e instanceof Error ? e.message : String(e) });
    }
  };
  await Promise.all(briefs.map(writeOne));

  if (run) await admin.from("blog_runs").update({ finished_at: new Date().toISOString(), created: result.created.length, errors: result.errors.length ? result.errors : null }).eq("id", run.id);
  return result;
}

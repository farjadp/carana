// ============================================================================
// Source: lib/blog/pipeline.ts
// Version: 1.0.0 — 2026-08-24
// Why: The parts of the article pipeline that do not care where the topic came
//      from. Extracted when the source-driven writer (source-writer.ts) was
//      added, so the data-driven writer (generate.ts) and it share one
//      inventory, one voice, one link-verification rule and one insert.
//
//      Two things live here that are worth defending:
//
//      · VOICE. `HUMAN_VOICE` and `humanise()` are a single definition of what
//        "not written by a machine" means for this site, expressed as rules a
//        model can actually follow (rhythm, banned tics, register, one stated
//        opinion) rather than the wish "sound human". Both writers run the
//        same second pass, so a reader cannot tell which pipeline produced a
//        given article.
//
//      · LINKS. The writer never invents a path. It picks from an inventory we
//        hand it, and every link is checked against that inventory again after
//        the prose is final; anything unrecognised is demoted to plain text. A
//        blog that 404s inside itself is worse than no blog.
// Env / Identity: Server only. OpenAI + service role.
// ============================================================================
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

import { PUBLIC_STATUSES, slugify } from "@goplaza/core";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { cityConfigs } from "@/lib/data/cities";
import { MIN_INDEXABLE, countCategoryCities } from "@/lib/seo/local";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const WRITER_MODEL = process.env.BLOG_MODEL ?? "gpt-4.1";
export const AUTO_PUBLISH = process.env.BLOG_AUTO_PUBLISH === "true";

export type GenerateResult = {
  created: { id: string; slug: string; title: string }[];
  errors: { title?: string; error: string }[];
  skipped?: { title: string; reason: string }[];
};

// ---------------------------------------------------------------------------
// Inventory — what the writer may link to and quote
// ---------------------------------------------------------------------------
export type LinkTarget = { path: string; label: string; kind: "category" | "city" | "local" | "business" | "page" };
export type Inventory = Awaited<ReturnType<typeof buildInventory>>;

export async function buildInventory() {
  const admin = createSupabaseAdminClient();
  const targets: LinkTarget[] = [
    { path: "/search", label: "جستجوی پلازا", kind: "page" },
    { path: "/how-it-works", label: "چطور کار می‌کند", kind: "page" },
    { path: "/trust", label: "نشان تأیید چیست", kind: "page" },
    { path: "/dashboard/business/new", label: "ثبت رایگان کسب‌وکار", kind: "page" },
    { path: "/download", label: "دانلود اپ پلازا", kind: "page" },
    { path: "/blog", label: "وبلاگ پلازا", kind: "page" },
    { path: "/jobs", label: "آگهی‌های استخدام", kind: "page" },
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

  // Published posts, so a new article can link to an older one. This is the
  // half of internal linking the first version was missing: the blog only
  // pointed outward into the directory and never at itself.
  const { data: posts } = await admin
    .from("blog_posts")
    .select("slug, title, category_slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  for (const p of posts ?? []) targets.push({ path: `/blog/${p.slug}`, label: p.title, kind: "page" });

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

/** The FACTS block every writer prompt pastes verbatim. */
export function factsBlock(inv: Inventory): string {
  return [
    `Canada-wide, all cities: ${inv.total} public listings; ${inv.verified} verified (Canada-wide)`,
    ...inv.localFacts.map((f) => `${f.label}: ${f.count} → ${f.path}`),
  ].join("\n");
}

/** The inventory block every writer prompt pastes verbatim. */
export function linkBlock(inv: Inventory): string {
  return inv.targets.map((t) => `${t.path} — ${t.label}`).join("\n");
}

// ---------------------------------------------------------------------------
// Voice — one definition, used by every writer
// ---------------------------------------------------------------------------

/** Rules for the first (structured) pass. */
export const HOUSE_STYLE = `Style: expert but plain; second-person singular خودمانی ("پیدا کن", "بپرس"); never first-person singular ("من", "خودم") and never invented personal anecdotes — the only first person allowed is "ما در پلازا" about the directory's data; written register, not spoken (می‌رسد not می‌رسه, است not ـه، را not رو); GOPLAZA launched in 2026 — never "سال‌ها" or "همیشه" about our own experience; the word "تأییدشده/verified" only for the verified count itself, never as a synonym for "listed"; nim-fasele (نیم‌فاصله) always; Persian digits inside Persian text; keep English proper nouns (city names, RRSP, TFSA, T1, CRA, IRCC) in Latin; no "در این مقاله"; no filler intro; open with the reader's situation in two sentences; end with a short "بعدش چه کار کنم" section that points to the site. Do not invent statistics, prices, laws or names. Where a rule depends on province, say "در انتاریو…" explicitly and keep it general.`;

/** Rules for the second (humanising) pass. */
export const HUMAN_VOICE = `- Vary sentence length hard: some very short. Some longer, with a clause that adds a concrete detail. Never three sentences in a row of similar length.
- Delete AI-isms outright: "در دنیای امروز", "قابل توجه است که", "به طور کلی", "در نهایت", "بیایید", "مهم است بدانید", "شایان ذکر است", "بدون شک", "در عصر حاضر", "می‌تواند به شما کمک کند تا", "نقش مهمی ایفا می‌کند".
- No paragraph may open with the same word as the one before it; no three consecutive sentences starting with "این".
- No tricolon padding ("سریع، آسان و مطمئن") and no bullet list longer than five items.
- Cut hedging stacks: pick "معمولاً" or "اغلب", never both. Cut adverbs. Prefer verbs to nominalisations (بررسی کن, not انجام بررسی).
- NEVER first-person singular — no "من", no "خودم", no verb in the first-person singular ("می‌کنم", "دیدم", "بررسی کردم", "متوجه شدم"). The writer is a team, not a person with memories.
- Exactly one aside in first-person plural ("ما در پلازا دیده‌ایم که…"), and it may ONLY restate a number that is already in the article. GOPLAZA launched in 2026 and has no observations from before it — never claim one.
- Add NO new fact. Not a number, not a percentage, not a price, not a year, not a neighbourhood, not a school, not a shop, not a brand, not an anecdote. Every figure, place and date in your output must already appear in the article you were given. If a paragraph feels thin, make the existing point sharper — do not invent an example to fill it.
- Exactly one place where the article takes a position ("به نظر ما…") and gives the reason for it.
- One concrete, checkable detail per section — a number we were given, a document name, a month, a neighbourhood.
- Keep the written register: no spoken/broken forms (می‌رسه، می‌شه، رو، تو به‌جای در). خودمانی means plain and direct, not colloquial spelling.
- Keep نیم‌فاصله and Persian digits.`;

/**
 * Every number in a piece of text, as Latin-digit tokens.
 *
 * Persian digits are folded and separators are ignored, so ۴۲٫۵ / ۴۲.۵ / ۴۲/۵
 * all reduce to the same pair of tokens — a rewrite that only changes decimal
 * punctuation must not read as a fabricated figure.
 */
export function numberTokens(text: string): Set<string> {
  const latin = text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  return new Set((latin.match(/\d+/g) ?? []).filter((n) => n.length <= 6));
}

/**
 * Numbers the rewrite introduced. The humanising pass is the one place a model
 * is asked to be creative, and creativity is exactly where it invents a "۱۵
 * درصد صرفه‌جویی" or a "تابستان ۲۰۲۳" that nobody measured. Comparing digits
 * before and after catches that class outright, without another model call.
 */
export function inventedNumbers(before: string, after: string): string[] {
  const had = numberTokens(before);
  return [...numberTokens(after)].filter((n) => !had.has(n));
}

export const wordCount = (md: string) => md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").split(/\s+/).filter(Boolean).length;

/**
 * If a draft comes out short, grow it with substance — examples, a table, a
 * checklist — never filler. Guarded the same way as humanise(): an expansion
 * that brings new digits with it has invented data to fill space, and a short
 * honest article beats a padded dishonest one.
 */
export async function expand(body: string, target = 1100): Promise<string> {
  let grown = await expandPass(body, target);
  let bad = inventedNumbers(body, grown);
  if (!bad.length) return grown;

  // Retry once, naming the offenders, exactly as humanise() does. Abandoning
  // the expansion on the first slip left real articles at ~520 words when they
  // were briefed for 1,000 — the guard was costing length it did not need to.
  console.warn("blog/expand: invented numbers, retrying —", bad.join(", "));
  grown = await expandPass(body, target, `\nThe previous attempt invented figures that are not in the article: ${bad.join(", ")}. Add examples and structure WITHOUT any new number, percentage, year or price.\n`);
  bad = inventedNumbers(body, grown);
  if (!bad.length) return grown;

  console.warn("blog/expand: still inventing numbers, keeping the shorter draft —", bad.join(", "));
  return body;
}

async function expandPass(body: string, target: number, extra = ""): Promise<string> {
  const { text } = await generateText({
    model: openai(WRITER_MODEL),
    temperature: 0.7,
    prompt: `This Persian article is ${wordCount(body)} words; it should be about ${target}. Expand it to roughly ${target} words by adding SUBSTANCE only: a concrete example under each thin section, one comparison table or checklist where it helps, a short "اشتباه‌های رایج" section if there is none. Keep every existing heading, fact, number, link, table and the [INLINE_IMAGE] marker exactly. Do not add filler sentences, do not add an intro or a conclusion paragraph, and do not introduce ANY number, percentage, year, price, law, street, neighbourhood, school or business name that is not already in the text below. Keep نیم‌فاصله and Persian digits.
${extra}
Return only the markdown.

ARTICLE:
${body}`,
  });
  return text.trim();
}

async function humanisePass(body: string, extra = ""): Promise<string> {
  const { text } = await generateText({
    model: openai(WRITER_MODEL),
    temperature: 0.9,
    prompt: `Rewrite the following Persian article so it reads as written by one experienced person, not a template. Keep every fact, number, heading, link, markdown table and the [INLINE_IMAGE] marker exactly; do not add or remove sections; keep the total length within 10% of the original. Change the prose, not the substance:

${HUMAN_VOICE}
${extra}
Return only the markdown.

ARTICLE:
${body}`,
  });
  return text.trim();
}

/**
 * The voice pass, with a guard.
 *
 * A rewrite that introduces a number nobody gave it has invented a fact, and
 * an invented fact is the one failure mode this blog cannot ship. So the pass
 * is checked, retried once with the offending figures named, and — if it
 * offends again — discarded in favour of the draft, which was written under
 * the "quote only the FACTS given" rule. A slightly stiffer article is a much
 * cheaper mistake than a confident wrong one.
 */
export async function humanise(body: string): Promise<string> {
  let out = await humanisePass(body);
  let bad = inventedNumbers(body, out);
  if (!bad.length) return out;

  console.warn("blog/humanise: invented numbers, retrying —", bad.join(", "));
  out = await humanisePass(
    body,
    `\nThe previous attempt at this rewrite invented figures that are not in the article: ${bad.join(", ")}. Do not introduce those, or any other number, percentage, year, price, street, neighbourhood, school or business name that is not already in the text below.\n`,
  );
  bad = inventedNumbers(body, out);
  if (!bad.length) return out;

  console.warn("blog/humanise: still inventing numbers —", bad.join(", "), "; keeping the draft prose");
  return body;
}

// ---------------------------------------------------------------------------
// Links, slug, persist
// ---------------------------------------------------------------------------
export function extractInternalLinks(md: string): string[] {
  const out = new Set<string>();
  for (const m of md.matchAll(/\]\((\/[^)\s#?]+)/g)) out.add(m[1]);
  return [...out];
}

/** `search` → `/search`; `/cities/toronto/?x=1` → `/cities/toronto`. */
function normalisePath(href: string): string {
  const withSlash = href.startsWith("/") ? href : `/${href}`;
  const bare = withSlash.split(/[#?]/)[0];
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
}

export function verifyPaths(paths: string[], inv: Inventory): string[] {
  const known = new Set(inv.targets.map((t) => t.path));
  return paths.filter((p) => known.has(p));
}

/**
 * Keep only links we can prove exist; everything else becomes plain text.
 *
 * Three things this has to survive, all of them seen in real output:
 *
 * · **A missing leading slash.** The model writes `[/search](search)` about as
 *   often as `[متن](/search)`. The first version only looked at hrefs starting
 *   with `/`, so those were neither recognised nor demoted — they shipped, and
 *   `search` resolves against `/blog/…`, giving a 404 inside our own article.
 *   Hrefs are normalised before they are judged.
 * · **The path used as the anchor text.** `[/search](/search)` renders as the
 *   literal string "/search" in the middle of a Persian sentence. When the
 *   visible text is a path, the inventory's own label replaces it.
 * · **Outbound links.** Stripped to plain text — an article we wrote should
 *   not hand its readers to someone else mid-sentence. Attribution belongs in
 *   the `sources` block at the foot, where a reader can see what it is.
 */
export function enforceLinks(md: string, inv: Inventory): { body: string; links: string[] } {
  const label = new Map(inv.targets.map((t) => [t.path, t.label]));
  const used = new Set<string>();
  // The `(?<!!)` keeps image syntax out of this; the optional trailing group
  // absorbs a markdown title (`[x](/y "title")`).
  const body = md.replace(/(?<!!)\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g, (_m, text: string, href: string) => {
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return text;
    const path = normalisePath(href);
    if (!label.has(path)) return text;
    used.add(path);
    const anchor = text.trim().startsWith("/") ? label.get(path) ?? text : text;
    return `[${anchor}](${path})`;
  });
  return { body, links: [...used] };
}

export async function uniqueSlug(base: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const slug = slugify(base).slice(0, 70) || `post-${Date.now()}`;
  const { data } = await admin.from("blog_posts").select("slug").like("slug", `${slug}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

export type PostRow = {
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string | null;
  summary_en: string | null;
  key_takeaway: string | null;
  body_md: string;
  cover_url: string | null;
  cover_alt: string | null;
  category_slug: string;
  tags: string[];
  status: "review" | "published";
  published_at: string | null;
  reading_minutes: number | null;
  faq: { q: string; a: string }[];
  sources: { title: string; url: string }[] | null;
  internal_links: string[];
  ai_model: string;
  topic_seed: string;
  source_article_id?: string | null;
};

export async function insertPost(row: PostRow) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("blog_posts").insert(row).select("id, slug, title").single();
  if (error) throw error;
  return data as { id: string; slug: string; title: string };
}

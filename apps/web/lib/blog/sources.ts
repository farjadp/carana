// ============================================================================
// Source: lib/blog/sources.ts
// Version: 1.0.0 — 2026-08-24
// Why: Harvest topics from external Persian-Canadian publications so the
//      generator knows what happened this morning, not only what our own
//      database knows.
//
//      What this file does and does not do, because the distinction is the
//      whole legal and editorial basis of the feature:
//        · It reads a source's public REST collection and keeps a LEDGER of
//          article ids we have seen (`blog_source_articles`). The ledger is
//          what makes "ten NEW ones" mean something across daily runs.
//        · It extracts plain text so the writer can be handed FACTS —
//          numbers, names, dates, what was announced by whom. The extracted
//          text is a working input, never stored as a post and never shipped
//          to a reader.
//        · It does not translate, spin, or paraphrase. The article GOPLAZA
//          publishes is written from scratch against our own brief, our own
//          data and our own internal links, and cites the original.
//
//      Discovery is the WordPress REST collection rather than the sitemap:
//      the same lesson as scripts/scrape-gooya.mts — Yoast sitemaps under-
//      report, /wp-json/wp/v2/posts reports X-WP-Total honestly.
// Env / Identity: Server only. Service role for the ledger; anonymous,
//      read-only, rate-limited HTTP to the source.
// ============================================================================
import * as cheerio from "cheerio";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const UA = "GoPlazaBot/1.0 (+https://goplaza.ca/about; topic discovery)";
const FETCH_TIMEOUT_MS = 15_000;

export type BlogSource = {
  slug: string;
  name: string;
  home_url: string;
  kind: "wordpress";
  api_base: string | null;
  include_categories: number[];
  exclude_categories: number[];
  enabled: boolean;
  fresh_days: number;
  weight: number;
};

/** One harvested article, already reduced to what the writer needs. */
export type SourceArticle = {
  ledgerId: string;
  sourceSlug: string;
  sourceName: string;
  externalId: string;
  url: string;
  title: string;
  publishedAt: string | null;
  /** Plain text of the original, capped. A working input — never published. */
  text: string;
  /** Whether this came from the fresh window or the archive. */
  vintage: "fresh" | "archive";
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
async function getJson<T>(url: string): Promise<{ body: T; total: number; totalPages: number } | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctl.signal, cache: "no-store" });
    if (!res.ok) {
      console.error("blog/sources: HTTP", res.status, url);
      return null;
    }
    return {
      body: (await res.json()) as T,
      total: Number(res.headers.get("x-wp-total") ?? 0),
      totalPages: Number(res.headers.get("x-wp-totalpages") ?? 0),
    };
  } catch (e) {
    console.error("blog/sources: fetch failed", url, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * WordPress `content.rendered` → plain text.
 *
 * Everything structural is dropped on purpose. Scripts, iframes (atash embeds
 * Google Maps and YouTube), figures, related-post boxes and share widgets are
 * not facts; the anchors inside the body all point back into the source's own
 * tag pages, and carrying them anywhere near our writer would be how a link
 * to someone else's site accidentally ends up in our article.
 */
/** Exported so the extraction can be exercised without touching the ledger. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, iframe, figure, figcaption, noscript, .sharedaddy, .wp-block-embed, .related, blockquote.twitter-tweet").remove();
  // Braces, not a concise body: `.each` types its callback as returning void,
  // and `replaceWith` returns a Cheerio, which fails the build.
  $("a").each((_, el) => {
    $(el).replaceWith($(el).text());
  });
  const parts: string[] = [];
  $("p, li, h2, h3, h4, td").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length > 1) parts.push(t);
  });
  const text = (parts.length ? parts.join("\n") : $.root().text()).replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, 9000);
}

const decodeEntities = (s: string) => cheerio.load(`<x>${s}</x>`)("x").text().replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// WordPress collection reads
// ---------------------------------------------------------------------------
type WpPost = {
  id: number;
  date_gmt: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
};

const WP_FIELDS = "id,date_gmt,link,title,excerpt,content,categories";

function collectionUrl(src: BlogSource, params: Record<string, string | number>): string {
  const u = new URL(`${src.api_base}/posts`);
  u.searchParams.set("_fields", WP_FIELDS);
  u.searchParams.set("orderby", "date");
  u.searchParams.set("order", "desc");
  if (src.include_categories.length) u.searchParams.set("categories", src.include_categories.join(","));
  if (src.exclude_categories.length) u.searchParams.set("categories_exclude", src.exclude_categories.join(","));
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  return u.toString();
}

/** Newest articles inside the source's freshness window. */
async function fetchFresh(src: BlogSource, limit: number): Promise<WpPost[]> {
  const after = new Date(Date.now() - src.fresh_days * 864e5).toISOString().replace(/\.\d+Z$/, "");
  const r = await getJson<WpPost[]>(collectionUrl(src, { per_page: Math.min(100, limit), page: 1, after }));
  return r?.body ?? [];
}

/**
 * A slice of the archive, for when the fresh window did not yield enough.
 * A random page rather than the oldest page: the archive is 5,000+ pages deep
 * and always reading from one end would mine the same decade forever.
 */
async function fetchArchive(src: BlogSource, limit: number): Promise<WpPost[]> {
  const before = new Date(Date.now() - src.fresh_days * 864e5).toISOString().replace(/\.\d+Z$/, "");
  const per = Math.min(50, Math.max(10, limit * 3));
  const head = await getJson<WpPost[]>(collectionUrl(src, { per_page: per, page: 1, before }));
  if (!head) return [];
  // Stay inside the last ~3 years of the archive: older news has no lasting
  // value, and the brief step would reject it anyway — cheaper not to fetch it.
  const maxPage = Math.max(1, Math.min(head.totalPages, Math.ceil((3 * 365) / per)));
  const page = 1 + Math.floor(Math.random() * maxPage);
  if (page === 1) return head.body;
  const r = await getJson<WpPost[]>(collectionUrl(src, { per_page: per, page, before }));
  return r?.body ?? head.body;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------
type LedgerRow = { id: string; external_id: string; url: string; title: string | null; published_at: string | null; status: string };

/** Insert anything we have not seen before. Existing rows are left untouched. */
async function recordSeen(src: BlogSource, posts: WpPost[]): Promise<void> {
  if (!posts.length) return;
  const admin = createSupabaseAdminClient();
  const rows = posts.map((p) => ({
    source_slug: src.slug,
    external_id: String(p.id),
    url: p.link,
    title: decodeEntities(p.title?.rendered ?? "").slice(0, 400),
    excerpt: decodeEntities(p.excerpt?.rendered ?? "").slice(0, 600),
    published_at: p.date_gmt ? `${p.date_gmt}Z` : null,
  }));
  // ignoreDuplicates: a re-run must not reset an article we already marked
  // `used` back to `new` — that is how the same story gets written twice.
  const { error } = await admin.from("blog_source_articles").upsert(rows, { onConflict: "source_slug,external_id", ignoreDuplicates: true });
  if (error) console.error("blog/sources: ledger upsert failed", error.message);
}

async function unusedFromLedger(src: BlogSource, limit: number): Promise<LedgerRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("blog_source_articles")
    .select("id, external_id, url, title, published_at, status")
    .eq("source_slug", src.slug)
    .eq("status", "new")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerRow[];
}

export async function markLedger(id: string, status: "used" | "skipped" | "failed", reason?: string, postId?: string) {
  const admin = createSupabaseAdminClient();
  await admin.from("blog_source_articles").update({ status, reason: reason?.slice(0, 500) ?? null, post_id: postId ?? null }).eq("id", id);
}

// ---------------------------------------------------------------------------
// Harvest
// ---------------------------------------------------------------------------
export async function listSources(onlyEnabled = true): Promise<BlogSource[]> {
  const admin = createSupabaseAdminClient();
  let q = admin.from("blog_sources").select("*").order("weight", { ascending: false });
  if (onlyEnabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data ?? []) as BlogSource[];
}

/** Fetch the full text for ledger rows that only carry a title and a URL. */
async function hydrate(src: BlogSource, rows: LedgerRow[], vintage: SourceArticle["vintage"]): Promise<SourceArticle[]> {
  const out: SourceArticle[] = [];
  for (const row of rows) {
    const r = await getJson<WpPost>(`${src.api_base}/posts/${encodeURIComponent(row.external_id)}?_fields=${WP_FIELDS}`);
    if (!r?.body?.content?.rendered) {
      await markLedger(row.id, "failed", "content unavailable");
      continue;
    }
    const text = htmlToText(r.body.content.rendered);
    if (text.length < 350) {
      await markLedger(row.id, "skipped", "too short to carry facts");
      continue;
    }
    out.push({
      ledgerId: row.id,
      sourceSlug: src.slug,
      sourceName: src.name,
      externalId: row.external_id,
      url: row.url,
      title: row.title ?? decodeEntities(r.body.title?.rendered ?? ""),
      publishedAt: row.published_at,
      text,
      vintage,
    });
    await new Promise((res) => setTimeout(res, 200)); // polite
  }
  return out;
}

/**
 * Return up to `n` articles nobody has written from yet.
 *
 * Fresh first. If the fresh window is thin — a quiet week, or a run that
 * already consumed today's news — the shortfall is filled from the archive,
 * which is exactly the "اگر کمتر بود برو از مقالات قدیمی" rule.
 */
export async function harvest(n: number): Promise<{ articles: SourceArticle[]; notes: string[] }> {
  const notes: string[] = [];
  const sources = await listSources();
  if (!sources.length) return { articles: [], notes: ["no enabled sources"] };

  const picked: SourceArticle[] = [];
  for (const src of sources) {
    if (picked.length >= n) break;
    if (!src.api_base) {
      notes.push(`${src.slug}: no api_base`);
      continue;
    }
    const want = n - picked.length;

    await recordSeen(src, await fetchFresh(src, Math.max(20, want * 3)));
    const fresh = await unusedFromLedger(src, want);
    const freshArticles = await hydrate(src, fresh, "fresh");
    picked.push(...freshArticles);
    notes.push(`${src.slug}: ${freshArticles.length} fresh`);

    if (picked.length < n) {
      const short = n - picked.length;
      await recordSeen(src, await fetchArchive(src, short));
      const seenIds = new Set(picked.map((a) => a.ledgerId));
      const more = (await unusedFromLedger(src, short + freshArticles.length)).filter((r) => !seenIds.has(r.id)).slice(0, short);
      const archiveArticles = await hydrate(src, more, "archive");
      picked.push(...archiveArticles);
      notes.push(`${src.slug}: ${archiveArticles.length} from archive (fresh window was ${short} short)`);
    }
  }
  return { articles: picked.slice(0, n), notes };
}

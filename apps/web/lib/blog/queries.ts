// ============================================================================
// Source: lib/blog/queries.ts
// Version: 1.2.0 — 2026-08-24
// Why: Read side of the blog for the public pages and the feed.
// Env / Identity: Anon client; RLS shows published only.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export const POST_COLUMNS =
  "id, slug, title, title_en, excerpt, summary_en, cover_url, cover_alt, category_slug, tags, published_at, author_name, reading_minutes, updated_at";

export type PostCard = {
  id: string; slug: string; title: string; title_en: string | null; excerpt: string | null; summary_en: string | null;
  cover_url: string | null; cover_alt: string | null; category_slug: string | null; tags: string[];
  published_at: string | null; author_name: string; reading_minutes: number | null; updated_at: string;
};
export type PostFull = PostCard & {
  body_md: string;
  key_takeaway: string | null;
  faq: { q: string; a: string }[] | null;
  internal_links: string[];
  sources: { title: string; url: string }[] | null;
};
export type BlogCategory = { slug: string; name: string; name_en: string; description: string | null; display_order: number };

export async function listCategories(supabase: SupabaseClient): Promise<BlogCategory[]> {
  const { data } = await supabase.from("blog_categories").select("*").order("display_order");
  return (data ?? []) as BlogCategory[];
}

export async function listPosts(supabase: SupabaseClient, opts: { category?: string; page?: number; perPage?: number; tag?: string } = {}) {
  const per = opts.perPage ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  let q = supabase.from("blog_posts").select(POST_COLUMNS, { count: "exact" }).eq("status", "published").order("published_at", { ascending: false });
  if (opts.category) q = q.eq("category_slug", opts.category);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  const { data, count } = await q.range((page - 1) * per, page * per - 1);
  return { posts: (data ?? []) as PostCard[], total: count ?? 0, page, perPage: per };
}

export async function getPost(supabase: SupabaseClient, slug: string): Promise<PostFull | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select(`${POST_COLUMNS}, body_md, key_takeaway, faq, internal_links, sources`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data ?? null) as PostFull | null;
}

export async function relatedPosts(supabase: SupabaseClient, post: PostCard, n = 3): Promise<PostCard[]> {
  const { data } = await supabase
    .from("blog_posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .neq("id", post.id)
    .eq("category_slug", post.category_slug ?? "")
    .order("published_at", { ascending: false })
    .limit(n);
  return (data ?? []) as PostCard[];
}

export const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "long" }) : "");

/**
 * Newest published posts, for the sections that live outside /blog — the home
 * page and the bottom of every inner page. Takes the same published-only path
 * as every other read here; when the table is empty it returns [] and the
 * caller renders nothing, because an empty «جدیدترین مقالات» heading would be
 * a promise the page cannot keep.
 */
export async function latestPosts(
  supabase: SupabaseClient,
  n = 3,
  opts: { excludeSlug?: string; category?: string } = {},
): Promise<PostCard[]> {
  let q = supabase
    .from("blog_posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(n);
  if (opts.category) q = q.eq("category_slug", opts.category);
  if (opts.excludeSlug) q = q.neq("slug", opts.excludeSlug);
  const { data } = await q;
  return (data ?? []) as PostCard[];
}

// ───────────────────────── suggestions for a business ─────────────────────────

/**
 * Words that, when a post uses them, make it genuinely about a business
 * category. Persian first because the posts are Persian; the English terms
 * catch the titles and tags that are written in Latin.
 *
 * This is a claim about relevance, so it stays narrow: «رستوران» is about
 * restaurants, «غذا» on its own is not. A word that would match half the blog
 * is worse than no match, because the section then promises a connection the
 * reader cannot see.
 */
const CATEGORY_WORDS: Record<string, string[]> = {
  "restaurant-cafe": ["رستوران", "کافه", "کبابی", "قنادی", "شیرینی", "restaurant", "cafe", "catering"],
  "medical-clinic": ["پزشک", "کلینیک", "دندانپزشک", "دارو", "سلامت", "روانشناس", "clinic", "dental", "health"],
  "legal-immigration": ["وکیل", "مهاجرت", "اقامت", "ویزا", "immigration", "lawyer", "visa"],
  "real-estate-mortgage": ["املاک", "مسکن", "خانه", "وام", "اجاره", "real estate", "mortgage", "realtor"],
  "accounting-tax": ["حسابدار", "مالیات", "صرافی", "بیمه", "accounting", "tax", "exchange", "insurance"],
  "beauty-wellness": ["آرایشگاه", "زیبایی", "اسپا", "آرایش", "باشگاه", "salon", "beauty", "spa"],
  "iranian-grocery": ["سوپرمارکت", "خواربار", "بقالی", "خوراکی", "ترشی", "grocery", "supermarket"],
  education: ["آموزش", "مدرسه", "کلاس", "دانشگاه", "زبان", "school", "education", "tutor"],
  "skilled-trades": ["تعمیر", "نقاشی", "برق", "لوله", "ساختمان", "اسباب‌کشی", "renovation", "plumbing"],
  events: ["رویداد", "جشن", "مراسم", "کنسرت", "عروسی", "event", "wedding"],
  automotive: ["خودرو", "اتومبیل", "ماشین", "مکانیک", "auto", "car"],
  "digital-it": ["دیجیتال", "وب‌سایت", "وبسایت", "نرم‌افزار", "هوش مصنوعی", "digital", "software", "marketing"],
};

/** The blog category a business category most often belongs to. Weakest signal. */
const CATEGORY_TO_BLOG: Record<string, string> = {
  "legal-immigration": "newcomers",
  "real-estate-mortgage": "guides",
  "accounting-tax": "business",
  "digital-it": "business",
  "iranian-grocery": "culture",
  "restaurant-cafe": "culture",
  education: "guides",
  "medical-clinic": "city-life",
};

/** Stable 32-bit hash — same input, same order, every render and every host. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type SuggestedPosts = {
  posts: PostCard[];
  /** How many of `posts` matched this business on something real. */
  matched: number;
  /** What the match was, for the subtitle. Null when nothing matched. */
  reason: { city: string | null; topic: boolean } | null;
};

/**
 * Posts to put under one business profile.
 *
 * "Random" in the sense Farjad asked for — every profile shows a different
 * set — but NOT random per request: the order is seeded by the business id, so
 * the page renders the same thing on the server and the client, caches, and
 * does not reshuffle under the reader on a soft navigation.
 *
 * Relevance is scored from what the post itself says (its title, excerpt and
 * tags), never from a guess: the city the business is in, then the words of
 * its category, then the blog category that usually covers it. `matched` comes
 * back with the posts so the caller can title the section for what it actually
 * has — calling three unrelated posts «مقالات مرتبط» is the same broken
 * promise as a badge nothing backs.
 */
export async function suggestedPostsFor(
  supabase: SupabaseClient,
  opts: { seed: string; city?: string | null; cityFa?: string | null; categorySlug?: string | null; n?: number },
): Promise<SuggestedPosts> {
  const n = opts.n ?? 3;
  // The blog is small and stays small; 60 is far more than we need to rank and
  // costs one query. Ordered so the pool is the newest writing, not a slice
  // Postgres happened to return.
  const { data } = await supabase
    .from("blog_posts")
    .select(POST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  const pool = (data ?? []) as PostCard[];
  if (pool.length === 0) return { posts: [], matched: 0, reason: null };

  const cityTerms = [opts.cityFa, opts.city].filter((c): c is string => Boolean(c && c.trim()));
  const words = opts.categorySlug ? (CATEGORY_WORDS[opts.categorySlug] ?? []) : [];
  const blogCat = opts.categorySlug ? CATEGORY_TO_BLOG[opts.categorySlug] : undefined;

  let cityHit: string | null = null;
  let topicHit = false;

  const scored = pool.map((p) => {
    const hay = `${p.title} ${p.title_en ?? ""} ${p.excerpt ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
    let score = 0;
    const city = cityTerms.find((c) => hay.includes(c.toLowerCase()));
    if (city) {
      score += 3;
      cityHit = city;
    }
    if (words.some((w) => hay.includes(w.toLowerCase()))) {
      score += 2;
      topicHit = true;
    }
    if (blogCat && p.category_slug === blogCat) score += 1;
    return { post: p, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Equal relevance → seeded order, so two businesses in the same city and
    // category do not show an identical trio.
    return hash(opts.seed + a.post.id) - hash(opts.seed + b.post.id);
  });

  const picked = scored.slice(0, n);
  const matched = picked.filter((s) => s.score > 0).length;
  return {
    posts: picked.map((s) => s.post),
    matched,
    reason: matched > 0 ? { city: cityHit, topic: topicHit } : null,
  };
}

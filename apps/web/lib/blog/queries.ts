// ============================================================================
// Source: lib/blog/queries.ts
// Version: 1.0.0 — 2026-08-16
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
export type PostFull = PostCard & { body_md: string; faq: { q: string; a: string }[] | null; internal_links: string[]; sources: { title: string; url: string }[] | null };
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
    .select(`${POST_COLUMNS}, body_md, faq, internal_links, sources`)
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

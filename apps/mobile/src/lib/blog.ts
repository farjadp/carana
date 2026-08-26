// ============================================================================
// Source: apps/mobile/src/lib/blog.ts
// Version: 1.1.0 — 2026-08-24
// Why: The app reads the same blog tables as the website, straight from
//      Supabase. RLS returns published rows only, so a draft in the admin
//      review queue can never appear here — verified, not assumed.
// Env / Identity: Anon client.
// ============================================================================
import { supabase } from "./supabase";

const CARD_COLUMNS =
  "id, slug, title, title_en, excerpt, cover_url, cover_alt, category_slug, tags, published_at, reading_minutes, view_count";

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  category_slug: string | null;
  tags: string[];
  published_at: string | null;
  reading_minutes: number | null;
  view_count: number;
};

export type Post = PostCard & {
  body_md: string;
  summary_en: string | null;
  author_name: string;
  faq: { q: string; a: string }[] | null;
  updated_at: string;
};

export type BlogCategory = { slug: string; name: string; name_en: string; description: string | null };

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const { data, error } = await supabase.from("blog_categories").select("slug, name, name_en, description").order("display_order");
  if (error) throw error;
  return (data ?? []) as BlogCategory[];
}

export async function listPosts(opts?: { category?: string | null; limit?: number }): Promise<PostCard[]> {
  let q = supabase
    .from("blog_posts")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(opts?.limit ?? 30);
  if (opts?.category) q = q.eq("category_slug", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PostCard[];
}

export async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(`${CARD_COLUMNS}, body_md, summary_en, author_name, faq, updated_at`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Post | null;
}

export async function relatedPosts(post: PostCard, n = 3): Promise<PostCard[]> {
  if (!post.category_slug) return [];
  const { data } = await supabase
    .from("blog_posts")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .eq("category_slug", post.category_slug)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(n);
  return (data ?? []) as unknown as PostCard[];
}

/**
 * Count a read. The app and the website call the SAME function, so the number
 * on an article is the total across both surfaces rather than one platform's
 * slice — which is the only honest reading of "بازدید".
 *
 * Fire and forget, and deliberately swallowing: a metric that cannot be
 * recorded must never reach the reader as an error. `increment_blog_post_view`
 * is SECURITY DEFINER and ignores unpublished rows, so this cannot do anything
 * beyond adding one to a counter.
 */
export async function incrementPostView(postId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_blog_post_view", { target_id: postId });
  if (error) console.warn("blog view count failed:", error.message);
}

export const faDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }) : "";

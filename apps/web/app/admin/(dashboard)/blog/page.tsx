// ============================================================================
// Source: app/admin/(dashboard)/blog/page.tsx
// Version: 1.1.0 — 2026-08-24
// Why: The blog desk — what is in review, what is live, run log, the source
//      registry with how much unused material each one still holds, and the
//      two "write now" buttons.
//
//      `channels` comes from configuredChannels() rather than a constant, so
//      the desk can only offer a share button for a channel whose credentials
//      are actually present.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { AUTO_SYNDICATE, configuredChannels } from "@/lib/blog/syndicate";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import { BlogDesk, type DeskPost, type DeskRun, type DeskShare } from "./blog-desk";

export const metadata = { title: "وبلاگ | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }
  const [{ data: posts }, { data: runs }, { data: cats }, { data: shares }, { data: srcRows }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("id, slug, title, title_en, status, category_slug, cover_url, published_at, created_at, reading_minutes, internal_links, topic_seed, ai_model, source_article_id, sources")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("blog_runs").select("*").order("started_at", { ascending: false }).limit(10),
    supabase.from("blog_categories").select("slug, name").order("display_order"),
    supabase.from("blog_syndications").select("post_id, channel, status, url, error"),
    supabase.from("blog_sources").select("slug, name, home_url, enabled").order("weight", { ascending: false }),
  ]);

  // "How much is left to write from" — the count of ledger rows we have seen
  // but not yet used. head+exact so we never pull 15,000 rows to count them.
  const sources = await Promise.all(
    (srcRows ?? []).map(async (s) => {
      const { count } = await supabase
        .from("blog_source_articles")
        .select("id", { count: "exact", head: true })
        .eq("source_slug", s.slug)
        .eq("status", "new");
      return { ...s, unused: count ?? 0 };
    }),
  );

  return (
    <BlogDesk
      posts={(posts ?? []) as DeskPost[]}
      runs={(runs ?? []) as DeskRun[]}
      categories={(cats ?? []) as { slug: string; name: string }[]}
      shares={(shares ?? []) as DeskShare[]}
      channels={configuredChannels()}
      autoPublish={process.env.BLOG_AUTO_PUBLISH === "true"}
      autoSyndicate={AUTO_SYNDICATE}
      perDay={Number(process.env.BLOG_POSTS_PER_DAY ?? 5)}
      model={process.env.BLOG_MODEL ?? "gpt-4.1"}
      sources={sources}
    />
  );
}

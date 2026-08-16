// ============================================================================
// Source: app/admin/(dashboard)/blog/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The blog desk — what is in review, what is live, run log, and a
//      "write now" button.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import { BlogDesk, type DeskPost, type DeskRun } from "./blog-desk";

export const metadata = { title: "وبلاگ | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }
  const [{ data: posts }, { data: runs }, { data: cats }] = await Promise.all([
    supabase.from("blog_posts").select("id, slug, title, title_en, status, category_slug, cover_url, published_at, created_at, reading_minutes, internal_links, topic_seed, ai_model").order("created_at", { ascending: false }).limit(200),
    supabase.from("blog_runs").select("*").order("started_at", { ascending: false }).limit(10),
    supabase.from("blog_categories").select("slug, name").order("display_order"),
  ]);
  return (
    <BlogDesk
      posts={(posts ?? []) as DeskPost[]}
      runs={(runs ?? []) as DeskRun[]}
      categories={(cats ?? []) as { slug: string; name: string }[]}
      autoPublish={process.env.BLOG_AUTO_PUBLISH === "true"}
      perDay={Number(process.env.BLOG_POSTS_PER_DAY ?? 5)}
      model={process.env.BLOG_MODEL ?? "gpt-4.1"}
    />
  );
}

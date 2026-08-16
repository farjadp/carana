// ============================================================================
// Source: app/admin/(dashboard)/blog/actions.ts
// Version: 1.0.0 — 2026-08-16
// Why: Admin edits to posts — publish / unpublish / archive, save edits,
//      trigger a generation run.
// Env / Identity: Admin only via requireAdmin; RLS-scoped writes.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { generatePosts } from "@/lib/blog/generate";
import { createSupabaseActionClient } from "@/lib/supabase/server";

async function admin() {
  const supabase = await createSupabaseActionClient();
  await requireAdmin(supabase);
  return supabase;
}

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/blog/feed.xml");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
}

export async function setPostStatus(id: string, status: "draft" | "review" | "published" | "archived") {
  const supabase = await admin();
  const patch: Record<string, unknown> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { data, error } = await supabase.from("blog_posts").update(patch).eq("id", id).select("slug").single();
  if (error) return { success: false, error: error.message };
  revalidateBlog(data.slug);
  return { success: true };
}

export async function savePost(id: string, fields: { title: string; title_en: string; excerpt: string; summary_en: string; body_md: string; category_slug: string; tags: string; cover_url: string; cover_alt: string; admin_note: string }) {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("blog_posts")
    .update({
      title: fields.title.trim(),
      title_en: fields.title_en.trim() || null,
      excerpt: fields.excerpt.trim() || null,
      summary_en: fields.summary_en.trim() || null,
      body_md: fields.body_md,
      category_slug: fields.category_slug || null,
      tags: fields.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
      cover_url: fields.cover_url.trim() || null,
      cover_alt: fields.cover_alt.trim() || null,
      admin_note: fields.admin_note.trim() || null,
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { success: false, error: error.message };
  revalidateBlog(data.slug);
  return { success: true };
}

export async function deletePost(id: string) {
  const supabase = await admin();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateBlog();
  return { success: true };
}

export async function runGenerator(n: number, publish: boolean) {
  await admin();
  const result = await generatePosts(Math.min(10, Math.max(1, n)), { publish });
  revalidateBlog();
  return result;
}

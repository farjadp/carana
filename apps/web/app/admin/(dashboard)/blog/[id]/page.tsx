// ============================================================================
// Source: app/admin/(dashboard)/blog/[id]/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Post editor — every field the writer produced, editable, with a live
//      preview of the markdown.
// Env / Identity: Admin only.
// ============================================================================
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import { PostEditor } from "./post-editor";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }
  const [{ data: post }, { data: cats }] = await Promise.all([
    supabase.from("blog_posts").select("*").eq("id", id).maybeSingle(),
    supabase.from("blog_categories").select("slug, name").order("display_order"),
  ]);
  if (!post) notFound();
  return <PostEditor post={post} categories={(cats ?? []) as { slug: string; name: string }[]} />;
}

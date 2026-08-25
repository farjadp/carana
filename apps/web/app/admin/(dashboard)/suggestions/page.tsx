// ============================================================================
// Source: app/admin/(dashboard)/suggestions/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Read and listen to what people asked for. Voice notes live in a private
//      bucket, so each gets a one-hour signed URL at render time.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { SuggestionsClient, type SuggestionRow } from "./suggestions-client";

export const metadata = { title: "پیشنهادها | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const pageFrom = (page - 1) * ADMIN_PAGE_SIZE;
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }

  const { data, count } = await supabase
    .from("suggestions")
    .select("id, user_id, body, voice_path, voice_seconds, contact, source, page, status, admin_note, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(pageFrom, pageFrom + ADMIN_PAGE_SIZE - 1);

  const rows = (data ?? []) as SuggestionRow[];
  const admin = createSupabaseAdminClient();

  // Signed URLs for voice, author emails for signed-in senders.
  const paths = rows.map((r) => r.voice_path).filter((p): p is string => !!p);
  const signed = paths.length
    ? await admin.storage.from("suggestions").createSignedUrls(paths, 60 * 60)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((u): u is string => !!u))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, email, full_name").in("id", userIds)
    : { data: [] };
  const byUser = new Map((profiles ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null }]));

  const enriched = rows.map((r) => ({
    ...r,
    voice_url: r.voice_path ? urlByPath.get(r.voice_path) ?? null : null,
    author: r.user_id ? byUser.get(r.user_id) ?? null : null,
  }));

  return (
    <>
      <SuggestionsClient rows={enriched} />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={count ?? 0} basePath="/admin/suggestions" itemLabel="پیشنهاد" />
      </div>
    </>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/reviews/page.tsx
// Version: 2.0.0 — 2026-08-22
// Why: Moderation queue for public reviews.
// Env / Identity: Admin/moderator only, verified here as well as in the layout.
//
// The previous version embedded `author:auth.users!...`, which PostgREST cannot
// resolve — the auth schema is not exposed — so the query silently returned no
// author and the reviewer was always unknown. Author names are now resolved in
// a second pass through the service-role client.
// ============================================================================
import { redirect } from "next/navigation";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import AdminReviewsClient from "./reviews-client";

export const metadata = {
  title: "بررسی نظرات | پنل مدیریت",
};

type ReviewRow = Record<string, unknown> & { user_id: string };

async function withAuthors(rows: ReviewRow[]) {
  if (rows.length === 0) return rows;

  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", [...new Set(rows.map((r) => r.user_id))]);

  const byId = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null }])
  );

  return rows.map((row) => ({
    ...row,
    author: byId.get(row.user_id) ?? null,
  }));
}

export default async function AdminReviewsPage({
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

  const { data: pending } = await supabase
    .from("public_reviews")
    .select("*, business:businesses(id, name)")
    .eq("status", "pending_moderation")
    .order("created_at", { ascending: false });

  // The decided pile is paged; the pending queue above is not, because a
  // moderation queue you cannot see the bottom of is a queue you cannot clear.
  const { data: recent, count: recentCount } = await supabase
    .from("public_reviews")
    .select("*, business:businesses(id, name)", { count: "exact" })
    .in("status", ["approved", "published", "rejected", "needs_changes"])
    .order("reviewed_at", { ascending: false })
    .range(pageFrom, pageFrom + ADMIN_PAGE_SIZE - 1);

  const [pendingReviews, recentReviews] = await Promise.all([
    withAuthors((pending ?? []) as ReviewRow[]),
    withAuthors((recent ?? []) as ReviewRow[]),
  ]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">مدیریت نظرات</h1>
        <p className="text-gray-500">نظرات ارسال شده کاربران را بررسی، تایید و یا رد کنید.</p>
      </div>

      <AdminReviewsClient pendingReviews={pendingReviews} recentReviews={recentReviews} />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={recentCount ?? 0} basePath="/admin/reviews" itemLabel="نظر" />
      </div>
    </div>
  );
}

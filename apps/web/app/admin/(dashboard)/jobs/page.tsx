// ============================================================================
// Source: app/admin/(dashboard)/jobs/page.tsx
// Version: 1.0.0 — 2026-08-18
// Why: Moderation queue for hiring ads. Only unverified posters land here —
//      a verified business publishes directly, which is what makes
//      verification worth something and keeps this queue small.
// Env / Identity: Admin/moderator only, checked here as well as in the layout
//      and again inside moderateJob().
// ============================================================================
import { redirect } from "next/navigation";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import AdminJobsClient, { type AdminJobRow } from "./jobs-client";

export const metadata = { title: "آگهی‌های استخدام | پنل مدیریت" };
export const dynamic = "force-dynamic";

const SELECT =
  "id, slug, title, description, employment_type, workplace_type, city, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english, apply_method, apply_value, status, moderation_reason, expires_at, closed_at, created_at, reviewed_at, business:businesses(id, name, slug)";

export default async function AdminJobsPage({
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
    .from("job_posts")
    .select(SELECT)
    .eq("status", "pending_moderation")
    .order("created_at", { ascending: false });

  // The decided pile is paged; the pending queue above is not, because a
  // moderation queue you cannot see the bottom of is a queue you cannot clear.
  const { data: recent, count: recentCount } = await supabase
    .from("job_posts")
    .select(SELECT, { count: "exact" })
    .in("status", ["published", "rejected", "closed"])
    .order("created_at", { ascending: false })
    .range(pageFrom, pageFrom + ADMIN_PAGE_SIZE - 1);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">آگهی‌های استخدام</h1>
        <p className="text-gray-500">
          فقط آگهی کسب‌وکارهای تاییدنشده به این صف می‌آید؛ کسب‌وکار تاییدشده مستقیم منتشر می‌کند.
        </p>
      </div>

      <AdminJobsClient
        pendingJobs={(pending ?? []) as unknown as AdminJobRow[]}
        recentJobs={(recent ?? []) as unknown as AdminJobRow[]}
      />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={recentCount ?? 0} basePath="/admin/jobs" itemLabel="آگهی" />
      </div>
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/reports/page.tsx
// Version: 2.0.0 — 2026-08-16
// Why: The abuse queue, now backed by `business_reports`. v1 was a static
//      "no reports" panel with no table behind it, next to a sidebar badge
//      that claimed there were two.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { ReportsClient, type ReportRow } from "./reports-client";

export const metadata = { title: "گزارش تخلفات | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("business_reports")
    .select(
      // Both possible subjects — a report is about a listing OR a bio page
      // (business_reports_has_subject). Without the second join, a link-page
      // report rendered as «کسب‌وکار حذف‌شده» with nothing to act on.
      "*, business:businesses(id, name, slug, city, status), link_page:link_pages(id, handle, title, status, suspended_reason)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const rows = (data ?? []) as unknown as ReportRow[];

  // Reporter emails resolve through the service role — `auth.users` is not
  // exposed to PostgREST, the same trap the reviews queue hit.
  const admin = createSupabaseAdminClient();
  const ids = [...new Set(rows.map((r) => r.reporter_id).filter((x): x is string => !!x))];
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null }]));

  return (
    <>
      <ReportsClient rows={rows.map((r) => ({ ...r, reporter: r.reporter_id ? byId.get(r.reporter_id) ?? null : null }))} />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={count ?? 0} basePath="/admin/reports" itemLabel="گزارش" />
      </div>
    </>
  );
}

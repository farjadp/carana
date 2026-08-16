// ============================================================================
// Source: app/admin/(dashboard)/reports/page.tsx
// Version: 2.0.0 — 2026-08-16
// Why: The abuse queue, now backed by `business_reports`. v1 was a static
//      "no reports" panel with no table behind it, next to a sidebar badge
//      that claimed there were two.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { ReportsClient, type ReportRow } from "./reports-client";

export const metadata = { title: "گزارش تخلفات | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }

  const { data } = await supabase
    .from("business_reports")
    .select("*, business:businesses(id, name, slug, city, status)")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as ReportRow[];

  // Reporter emails resolve through the service role — `auth.users` is not
  // exposed to PostgREST, the same trap the reviews queue hit.
  const admin = createSupabaseAdminClient();
  const ids = [...new Set(rows.map((r) => r.reporter_id).filter((x): x is string => !!x))];
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, email, full_name").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null }]));

  return <ReportsClient rows={rows.map((r) => ({ ...r, reporter: r.reporter_id ? byId.get(r.reporter_id) ?? null : null }))} />;
}

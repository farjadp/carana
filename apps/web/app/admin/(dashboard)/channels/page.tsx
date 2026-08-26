// ============================================================================
// Source: app/admin/(dashboard)/channels/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: Moderation queue for «کانال‌ها و گروه‌ها». Unlike the jobs board there
//      is no publish-directly path: a job ad hangs off a listing we have
//      already checked, and a channel hangs off nothing at all. So everything
//      queues, and this page is the only thing between the section and a wall
//      of spam links.
// Env / Identity: Admin/moderator only, checked here, in the layout, and again
//      inside moderateChannel().
// ============================================================================
import { redirect } from "next/navigation";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";
import AdminChannelsClient, { type AdminChannelRow } from "./channels-client";

export const metadata = { title: "کانال‌ها و گروه‌ها | پنل مدیریت" };
export const dynamic = "force-dynamic";

const SELECT =
  "id, slug, title, description, platform, kind, language, city, province, category_slug, join_url, tg_username, metrics_source, member_count, last_post_at, metrics_checked_at, check_failures, status, moderation_reason, confirm_by, created_at, reviewed_at";

export default async function AdminChannelsPage({
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

  // The pending queue is unpaged on purpose: a moderation queue whose bottom
  // you cannot see is a queue you cannot clear.
  const { data: pending } = await supabase
    .from("channels")
    .select(SELECT)
    .eq("status", "pending_moderation")
    .order("created_at", { ascending: false });

  const { data: recent, count } = await supabase
    .from("channels")
    .select(SELECT, { count: "exact" })
    .in("status", ["published", "rejected", "suspended"])
    .order("created_at", { ascending: false })
    .range(pageFrom, pageFrom + ADMIN_PAGE_SIZE - 1);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">کانال‌ها و گروه‌ها</h1>
        <p className="text-gray-500">
          هر مورد پیش از انتشار از این‌جا می‌گذرد. لینک را باز کن و ببین همانی است که ادعا شده — بعد
          از انتشار، فقط گزارش کاربران و تغییر نام خودکار می‌تواند غلط بودنش را لو بدهد.
        </p>
      </div>

      <AdminChannelsClient
        pending={(pending ?? []) as unknown as AdminChannelRow[]}
        recent={(recent ?? []) as unknown as AdminChannelRow[]}
      />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={count ?? 0} basePath="/admin/channels" itemLabel="مورد" />
      </div>
    </div>
  );
}

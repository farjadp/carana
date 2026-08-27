// ============================================================================
// Source: app/admin/(dashboard)/corrections/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The queue for «اصلاح اطلاعات» proposed by people who do not own the
//      listing — and, above it, the AUDIT the ladder owes: every correction a
//      معتمد published without a human, newest first.
//
//      That second list is the point. Phase 2 hands publication rights to an
//      algorithm's verdict about a person; the only thing that makes that
//      safe is being able to read, afterwards, exactly what it let through.
//      If this list is ever empty because nobody looks at it, the feature has
//      failed quietly.
//
//      Queue order follows standing: a proposer the ladder already trusts is
//      listed first (privilegesFor().queuePriority).
// Env / Identity: Admin-only, gated here as well as by the layout.
// ============================================================================
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { PencilLine, ShieldCheck } from "lucide-react";

import { CORRECTABLE_LABELS_FA, LEVEL_LABELS_FA, type CorrectableField } from "@goplaza/core";

import { tableExists } from "@/lib/admin/table-exists";
import { NotAuthenticatedError, requireAdmin } from "@/lib/auth/require-admin";
import { getStanding } from "@/lib/standing/ledger";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { CorrectionsClient, type CorrectionRow } from "./corrections-client";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = { title: "اصلاح اطلاعات | داشبورد ادمین" };
export const dynamic = "force-dynamic";

const label = (f: string) => CORRECTABLE_LABELS_FA[f as CorrectableField] ?? f;

export default async function CorrectionsAdminPage() {
  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase);
  } catch (e) {
    redirect(e instanceof NotAuthenticatedError ? "/admin/login" : "/auth/login?error=unauthorized");
  }

  const admin = createSupabaseAdminClient();
  const applied = await tableExists(admin, "business_corrections");
  if (!applied) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-black text-[color:var(--text)]">اصلاح اطلاعات</h1>
        <p className="rounded-xl border border-red-300 bg-red-50/40 p-4 text-sm font-bold text-red-700">
          جدول business_corrections پاسخ نمی‌دهد — مایگریشن 20260830460000 هنوز در
          SQL Editor اجرا نشده.
        </p>
      </div>
    );
  }

  const [{ data: pending }, { data: auto }] = await Promise.all([
    admin
      .from("business_corrections")
      .select("id, business_id, user_id, field, proposed, previous, note, created_at, businesses(name, slug)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("business_corrections")
      .select("id, business_id, user_id, field, proposed, previous, decided_at, businesses(name, slug)")
      .eq("applied_directly", true)
      .order("decided_at", { ascending: false })
      .limit(50),
  ]);

  // Queue priority: the ladder's cheapest privilege, and the only one level 1
  // has. Computed per proposer, so it is the same number the rest of the app
  // judges by.
  const rows: CorrectionRow[] = await Promise.all(
    (pending ?? []).map(async (r) => {
      const s = await getStanding(r.user_id as string);
      return {
        id: r.id as string,
        businessName: (r.businesses as { name?: string } | null)?.name ?? "—",
        businessSlug: (r.businesses as { slug?: string } | null)?.slug ?? "",
        fieldLabel: label(r.field as string),
        previous: JSON.stringify(r.previous ?? null),
        proposed: JSON.stringify(r.proposed),
        note: (r.note as string | null) ?? null,
        createdAt: r.created_at as string,
        level: s?.level ?? 0,
        levelLabel: LEVEL_LABELS_FA[s?.level ?? 0],
      };
    })
  );
  rows.sort((a, b) => b.level - a.level);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
          <PencilLine size={20} /> اصلاح اطلاعات
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted-text)]">
          پیشنهادهای کسانی که مالک آگهی نیستند. ترتیب بر اساس سطح پیشنهاددهنده.
        </p>
      </header>

      <CorrectionsClient rows={rows} />

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <ShieldCheck size={16} /> منتشرشده بدون صف (توسط «معتمد»)
        </h2>
        <p className="mb-3 text-xs text-[color:var(--muted-text)]">
          این فهرست ممیزیِ فاز ۲ است: هرچه نردبان بدون دخالت انسان منتشر کرده.
          خالی بودنش یعنی هنوز چیزی از این راه منتشر نشده — نه اینکه چیزی برای
          دیدن نیست.
        </p>
        {(auto ?? []).length === 0 ? (
          <p className="text-sm text-[color:var(--muted-text)]">هنوز موردی نیست.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--line)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-right text-xs text-[color:var(--muted-text)]">
                  <th className="p-2 font-normal">کسب‌وکار</th>
                  <th className="p-2 font-normal">فیلد</th>
                  <th className="p-2 font-normal">قبل</th>
                  <th className="p-2 font-normal">بعد</th>
                  <th className="p-2 font-normal">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {(auto ?? []).map((r) => (
                  <tr key={r.id as string} className="border-t border-[color:var(--line)]">
                    <td className="p-2">{(r.businesses as { name?: string } | null)?.name ?? "—"}</td>
                    <td className="p-2">{label(r.field as string)}</td>
                    <td className="p-2 max-w-[160px] truncate text-[color:var(--muted-text)]" dir="ltr">
                      {JSON.stringify(r.previous ?? null)}
                    </td>
                    <td className="p-2 max-w-[160px] truncate" dir="ltr">{JSON.stringify(r.proposed)}</td>
                    <td className="p-2 text-[color:var(--muted-text)]">
                      {r.decided_at
                        ? new Date(r.decided_at as string).toLocaleDateString("fa-IR", { dateStyle: "medium" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-[color:var(--muted-text)]">
          {fa((auto ?? []).length)} مورد در ۵۰ رکورد اخیر.
        </p>
      </section>
    </div>
  );
}

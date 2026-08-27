// ============================================================================
// Source: app/admin/(dashboard)/claims/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: The queue. Two things were wrong with 1.0: every row wore a hard-coded
//      «در انتظار بررسی» chip regardless of claim.status — approved and
//      rejected claims included — and nothing was clickable, so reviewing a
//      claim meant hunting for the business by name somewhere else. Rows now
//      link to /admin/claims/[id] and the chip reads the real column.
// Env / Identity: Server Component, admin section.
// ============================================================================
import { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "درخواست‌های مالکیت | داشبورد ادمین",
};

const STATUS_CHIP: Record<
  string,
  { label: string; className: string; Icon: typeof Clock }
> = {
  pending: {
    label: "در انتظار بررسی",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Icon: Clock,
  },
  approved: {
    label: "تایید شده",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "رد شده",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    Icon: XCircle,
  },
};

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase
    .from("business_claims")
    .select(`
      id,
      status,
      note,
      created_at,
      businesses ( id, name, slug ),
      profiles:user_id ( id, full_name, email )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">درخواست‌های مالکیت کسب‌وکار (Claims)</h1>
        <p className="text-[color:var(--muted-text)]">
          بررسی و تایید درخواست‌های ادعای مالکیت کسب‌وکارها توسط کاربران. روی هر ردیف کلیک کنید تا
          ببینید تایید آن دقیقاً چه چیزی را تغییر می‌دهد.
        </p>
      </div>

      {!claims || claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold">هیچ درخواستی ثبت نشده است</h3>
          <p className="text-sm text-muted-foreground mt-1">در حال حاضر هیچ درخواست مالکیتی در انتظار بررسی نیست.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/80 text-muted-foreground font-medium">
                <tr>
                  <th className="p-3">کسب‌وکار</th>
                  <th className="p-3">متقاضی</th>
                  <th className="p-3">ایمیل</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.map((claim: any) => {
                  const biz = Array.isArray(claim.businesses) ? claim.businesses[0] : claim.businesses;
                  const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles;
                  const chip = STATUS_CHIP[claim.status] ?? STATUS_CHIP.pending;
                  const href = `/admin/claims/${claim.id}`;

                  return (
                    <tr key={claim.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-0 font-semibold">
                        <Link href={href} className="block p-3 hover:underline">
                          {biz?.name || "—"}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block p-3">
                          {profile?.full_name || "کاربر"}
                        </Link>
                      </td>
                      <td className="p-0 text-muted-foreground">
                        <Link href={href} className="block p-3" dir="ltr">
                          {profile?.email || "—"}
                        </Link>
                      </td>
                      <td className="p-0 text-muted-foreground">
                        <Link href={href} className="block p-3">
                          {new Date(claim.created_at).toLocaleDateString("fa-IR")}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={href} className="block p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${chip.className}`}
                          >
                            <chip.Icon className="w-3.5 h-3.5" />
                            {chip.label}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0 text-muted-foreground">
                        <Link href={href} className="block p-3" aria-label="بررسی درخواست">
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

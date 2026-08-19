// ============================================================================
// Source: app/dashboard/business/page.tsx
// Version: 1.3.0 — 2026-08-13
// Why: Business owner dashboard displaying their registered businesses.
// Env / Identity: Server Component pulling live Supabase data.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle, Building2, Calendar, Clock, BarChart3, CreditCard, Megaphone, Briefcase } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateBusinessProfileProgress } from "@/lib/utils/progress";
import { Progress } from "@/components/ui/progress";
import { VerificationRenewalBanner } from "@/components/verification-renewal-banner";
import { BusyStatusToggle } from "@/components/business/busy-status-toggle";

export const metadata: Metadata = {
  title: "پنل صاحب کسب‌وکار",
};

const getStatusBadge = (status: string) => {
  switch(status) {
    case "SUBMITTED": return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">در انتظار تایید</span>;
    case "APPROVED": return <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">تایید شده</span>;
    case "PUBLISHED": return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">منتشر شده</span>;
    case "NEEDS_CHANGES": return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">نیازمند اصلاح</span>;
    case "REJECTED": return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">رد شده</span>;
    default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">پیش‌نویس</span>;
  }
};

export default async function BusinessDashboardPage() {
  const user = await requireUser("/dashboard/business");
  const supabase = await createSupabaseServerClient();

  // Both routes to ownership. `created_by` covers listings this account built
  // through onboarding; `owner_user_id` covers ones it claimed, where the row
  // was originally created by an admin during import. Filtering on created_by
  // alone hid every claimed business from the person who just proved they own
  // it. Both values are session UUIDs, so the or() filter string is not
  // attacker-controlled.
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fa-IR", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  return (
    <PageShell currentPath="/dashboard/business" currentSection="business">
      <main className="page-main">
        <section className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <p className="eyebrow">پنل صاحب کسب‌وکار</p>
            <h1>کسب‌وکارهای من</h1>
          </div>
          <Link 
            href="/dashboard/business/new"
            className="flex items-center gap-2 bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <PlusCircle size={20} />
            ثبت کسب‌وکار جدید
          </Link>
        </section>

        {(!businesses || businesses.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-3xl border border-dashed border-[color:var(--line)] text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 text-[color:var(--muted-text)] shadow-sm">
              <Building2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">هنوز کسب‌وکاری ثبت نکرده‌اید</h2>
            <p className="text-[color:var(--muted-text)] max-w-md mb-6">
              شما می‌توانید پروفایل کسب‌وکار خود را در دایرکتوری ایجاد کنید تا پس از بررسی تیم گوپلازا، به هزاران ایرانی در کانادا معرفی شوید.
            </p>
            <Link 
              href="/dashboard/business/new"
              className="bg-white border border-[color:var(--line)] px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              شروع ثبت‌نام
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map((b) => (
              <Card key={b.id} className="relative overflow-hidden hover:shadow-md transition-shadow group">
                <div className="absolute top-0 left-0 w-full h-1 bg-[color:var(--lajvard)] opacity-50 group-hover:opacity-100 transition-opacity" />
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[color:var(--text)] line-clamp-1">{b.name || "بدون نام"}</h3>
                      <p className="text-sm text-[color:var(--muted-text)] line-clamp-1" dir="ltr">{b.name_en}</p>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  {/* The six-month rule, owner side: countdown from day one. */}
                  <VerificationRenewalBanner business={b} />

                  <div className="space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-sm text-[color:var(--muted-text)]">
                      <div className="w-6 flex justify-center"><Building2 size={16} /></div>
                      <span>{b.category} • {b.city}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-[color:var(--muted-text)] bg-gray-50 p-2 rounded-lg">
                      <div className="w-6 flex justify-center text-gray-400"><Calendar size={16} /></div>
                      <span>تاریخ ثبت: <span dir="ltr">{formatDate(b.created_at)}</span></span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[color:var(--muted-text)]">
                      <div className="w-6 flex justify-center"><Clock size={14} /></div>
                      <span>آخرین بروزرسانی: <span dir="ltr">{new Date(b.updated_at || b.created_at).toLocaleDateString("fa-IR")}</span></span>
                    </div>
                    
                    {/* Business Profile Progress */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-gray-700">تکمیل پروفایل</span>
                        <span className="font-bold text-[color:var(--lajvard)]">{calculateBusinessProfileProgress(b)}٪</span>
                      </div>
                      <Progress value={calculateBusinessProfileProgress(b)} className="h-1.5 w-full" />
                    </div>

                    {/* Only meaningful once the listing is actually visible. */}
                    {b.status === "PUBLISHED" || b.status === "APPROVED" ? (
                      <div className="border-t border-gray-100 pt-3">
                        <span className="text-xs font-semibold text-gray-700">وضعیت زنده</span>
                        <BusyStatusToggle business={b} />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    <Link
                      href={`/dashboard/business/${b.id}/edit`}
                      className="flex-1 min-w-[45%] text-center py-2 text-sm font-medium text-[color:var(--lajvard)] bg-[color:var(--lajvard)]/10 hover:bg-[color:var(--lajvard)]/20 rounded-lg transition"
                    >
                      ویرایش اطلاعات
                    </Link>
                    <Link
                      href={`/dashboard/business/${b.id}/insights`}
                      className="flex-1 min-w-[45%] inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] rounded-lg transition"
                    >
                      <BarChart3 className="h-4 w-4" /> آمار
                    </Link>
                    <Link
                      href={`/dashboard/business/${b.id}/announcements`}
                      className="flex-1 min-w-[45%] inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] rounded-lg transition"
                    >
                      <Megaphone className="h-4 w-4" /> اعلان‌ها
                    </Link>
                    <Link
                      href={`/dashboard/business/${b.id}/jobs`}
                      className="flex-1 min-w-[45%] inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] rounded-lg transition"
                    >
                      <Briefcase className="h-4 w-4" /> استخدام
                    </Link>
                    <Link
                      href={`/dashboard/business/${b.id}/billing`}
                      className="flex-1 min-w-[45%] inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] rounded-lg transition"
                    >
                      <CreditCard className="h-4 w-4" /> اشتراک
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </PageShell>
  );
}

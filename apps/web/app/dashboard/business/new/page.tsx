// ============================================================================
// Source: app/dashboard/business/new/page.tsx
// Version: 2.0.0 — 2026-08-13
// Why: Rich, beautiful onboarding page with Hero, PageShell, Value proposition sidebar, and form.
// Env / Identity: Server Component with dynamic category pre-selection.
// ============================================================================

import { Metadata } from "next";
import BusinessOnboardingForm from "./onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/page-shell";
import { ShieldCheck, Sparkles, Building2, CheckCircle2, HelpCircle, PhoneCall } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ثبت کسب‌وکار جدید | čārana",
  description: "اطلاعات کسب‌وکار خود را برای ثبت در دایرکتوری مشاغل ایرانیان کانادا وارد کنید.",
};

export default async function NewBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: defaultCategory } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone_verified_at, email_verified_at")
    .eq("id", user.id)
    .single();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const phoneVerified = profile?.phone_verified_at && new Date(profile.phone_verified_at) > sixMonthsAgo;
  const emailVerified = profile?.email_verified_at && new Date(profile.email_verified_at) > sixMonthsAgo;

  if (!phoneVerified || !emailVerified) {
    redirect("/dashboard/verify-contact");
  }

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const categories = categoriesData?.map((c) => ({
    value: c.slug,
    label: c.name,
  })) || [];

  return (
    <PageShell currentPath="/dashboard/business/new" currentSection="business">
      <div className="min-h-screen bg-gray-50/50 pb-20" dir="rtl">
        {/* Hero Header */}
        <section className="bg-gradient-to-b from-gray-900 via-gray-900 to-slate-900 text-white py-12 px-4 md:px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs md:text-sm font-medium mb-3 border border-white/10">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>دایرکتوری مشاغل ایرانیان کانادا</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
                  ثبت و معرفی کسب‌وکار شما در čārana
                </h1>
                <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">
                  با تکمیل این فرم در ۷ مرحله ساده، پروفایل اختصاصی و سئو شده کسب‌وکار خود را بسازید تا توسط هم‌وطنان مقیم کانادا دیده شوید.
                </p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap md:flex-col gap-3">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2 text-xs">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span>ثبت و معرفی اولیه ۱۰۰٪ رایگان</span>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2 text-xs">
                  <CheckCircle2 size={18} className="text-blue-400" />
                  <span>بررسی و انتشار سریع توسط تیم</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Container & Sidebar Layout */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 -mt-6 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Form Column (8 cols) */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-xl border border-gray-200/80">
                <BusinessOnboardingForm
                  initialCategories={categories}
                  defaultCategory={defaultCategory || ""}
                />
              </div>
            </div>

            {/* Sidebar Column (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Why Join Banner */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Building2 size={20} className="text-[color:var(--lajvard)]" /> چرا کسب‌وکار خود را در چارانا ثبت کنید؟
                </h3>
                <ul className="space-y-3 text-xs md:text-sm text-gray-600 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>دیده شدن هدفمند:</strong> دسترسی مستقیم هزاران مخاطب فارسی‌زبان در استان‌های انتاریو، BC، کبک و آلبرتا.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>پروفایل حرفه‌ای سئو شده:</strong> ثبت آدرس، تلفن، واتساپ، گالری نمونه کارها و ساعات کاری.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>اعتبار و Badge تایید:</strong> دریافت تاییدیه رسمی چارانا جهت جلب اعتماد مشتریان جدید.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>نمایش روی نقشه شهری:</strong> قرارگیری روی نقشه اختصاصی دایرکتوری در شهر محل فعالیت.</span>
                  </li>
                </ul>
              </div>

              {/* Support & Assistance */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white rounded-3xl p-6 border border-blue-100 shadow-sm space-y-3 text-xs text-blue-950">
                <div className="flex items-center gap-2 font-bold text-sm text-[color:var(--lajvard)]">
                  <HelpCircle size={18} />
                  <span>نیاز به راهنمایی در ثبت دارید؟</span>
                </div>
                <p className="leading-relaxed">
                  تیم پشتیبانی چارانا در تمام مراحل ثبت، ویرایش اطلاعات و بارگذاری مدارک همراه شماست.
                </p>
                <div className="pt-2">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 font-bold text-blue-700 hover:text-blue-900 transition"
                  >
                    <PhoneCall size={14} /> تماس با پشتیبانی چارانا
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageShell>
  );
}

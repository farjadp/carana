// ============================================================================
// Source: app/cities/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Provide an index of supported Canadian city landing pages.
// Env / Identity: Server Component using static city metadata.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowLeft, Building2 } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cityConfigs } from "@/lib/data/cities";

export const metadata: Metadata = {
  title: "شهرها | čārana",
  description: "جستجوی کسب‌وکارهای ایرانیان کانادا بر اساس شهر.",
};

export default function CitiesPage() {
  return (
    <PageShell currentPath="/cities" currentSection="business">
      <main className="min-h-screen bg-gray-50/60">
        <section className="bg-white border-b border-gray-100 px-4 py-14 md:py-20">
          <div className="max-w-7xl mx-auto">
            <p className="eyebrow">جستجو بر اساس شهر</p>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-5">
              شهرهای فعال در čārana
            </h1>
            <p className="text-gray-600 max-w-2xl leading-relaxed">
              برای شروع، شهرهای اصلی جامعه ایرانیان کانادا را جدا کرده‌ایم تا کاربر سریع‌تر
              کسب‌وکارهای نزدیک، خدمات فارسی‌زبان و متخصصان محلی را پیدا کند.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {cityConfigs.map((city) => (
              <Card key={city.slug} className="bg-white border-gray-100 rounded-2xl hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-2xl bg-[color:var(--lajvard)]/10 text-[color:var(--lajvard)] flex items-center justify-center mb-5">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 mb-1">{city.provinceFa} / {city.province}</p>
                  <h2 className="text-xl font-black text-gray-900 mb-2">{city.nameFa}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-5">
                    {city.description}
                  </p>
                  <Button asChild variant="muted" className="w-full rounded-xl justify-between">
                    <Link href={`/cities/${city.slug}`}>
                      مشاهده شهر
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="max-w-7xl mx-auto bg-[color:var(--lajvard)] text-white rounded-3xl p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm font-bold mb-3">
                <Building2 className="h-4 w-4" />
                <span>کسب‌وکار ایرانی داری؟</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-3">شهر شما هنوز خلوت است؟ از کسب‌وکار خودت شروع کن.</h2>
              <p className="text-white/80 leading-relaxed max-w-2xl">
                هر پروفایل تاییدشده کمک می‌کند نقشه کسب‌وکارهای ایرانیان کانادا کامل‌تر و قابل اعتمادتر شود.
              </p>
            </div>
            <Button asChild className="bg-white text-[color:var(--lajvard)] hover:bg-white/90 rounded-xl shrink-0">
              <Link href="/dashboard/business/new">ثبت کسب‌وکار</Link>
            </Button>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

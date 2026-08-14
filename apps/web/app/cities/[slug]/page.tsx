// ============================================================================
// Source: app/cities/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Render city-specific discovery pages such as /cities/toronto.
// Env / Identity: Server Component using Supabase public listing data.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cityConfigs, getCityConfig } from "@/lib/data/cities";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VerificationBadge } from "@/components/verification-badge";
import { getVerificationStatus, isTrusted } from "@/lib/verification/status";

export const revalidate = 60;

type CityPageParams = {
  params: Promise<{ slug: string }>;
};

type BusinessCard = {
  id: string;
  slug?: string | null;
  name: string;
  name_en?: string | null;
  category?: string | null;
  short_description?: string | null;
  description?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  website?: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
  is_verified?: boolean | null;
  is_claimed?: boolean | null;
  is_featured?: boolean | null;
};

export function generateStaticParams() {
  return cityConfigs.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: CityPageParams): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityConfig(slug);

  if (!city) {
    return {
      title: "شهر پیدا نشد",
    };
  }

  return {
    title: `${city.nameFa} | کسب‌وکارهای ایرانی`,
    description: city.description,
  };
}

export default async function CityDetailPage({ params }: CityPageParams) {
  const { slug } = await params;
  const city = getCityConfig(slug);

  if (!city) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  
  // Build OR condition for city names and neighborhoods
  const cityConditions = [
    `city.ilike.%${city.nameEn}%`,
    `city.ilike.%${city.nameFa}%`,
    ...city.neighborhoods.map(n => `city.ilike.%${n}%`)
  ].join(',');

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("*")
    .in("status", ["APPROVED", "PUBLISHED"])
    .or(cityConditions)
    .order("created_at", { ascending: false })
    .limit(24);

  const cityBusinesses = (businesses ?? []) as BusinessCard[];
  const verifiedCount = cityBusinesses.filter((business) =>
    isTrusted(getVerificationStatus(business))
  ).length;
  const categoryCount = new Set(cityBusinesses.map((business) => business.category).filter(Boolean)).size;

  return (
    <PageShell currentPath={`/cities/${city.slug}`} currentSection="business">
      <main className="min-h-screen bg-gray-50/60">
        <section className="relative overflow-hidden bg-gray-950 text-white px-4 py-12 md:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,71,171,0.35),transparent_32%),linear-gradient(135deg,rgba(128,0,0,0.42),transparent_42%)]" />
          <div className="max-w-7xl mx-auto relative">
            <nav className="flex items-center gap-2 text-xs text-white/60 mb-7">
              <Link href="/" className="hover:text-white">خانه</Link>
              <span>/</span>
              <Link href="/cities" className="hover:text-white">شهرها</Link>
              <span>/</span>
              <span className="text-white">{city.nameFa}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold mb-4">
                  <MapPin className="h-4 w-4 text-emerald-300" />
                  <span>{city.nameEn}, {city.province}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black mb-5 leading-tight">
                  {city.headline}
                </h1>
                <p className="text-white/75 leading-relaxed max-w-3xl">
                  {city.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <strong className="block text-2xl font-black">{cityBusinesses.length}</strong>
                  <span className="text-xs text-white/60">کسب‌وکار</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <strong className="block text-2xl font-black">{verifiedCount}</strong>
                  <span className="text-xs text-white/60">تایید شده</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <strong className="block text-2xl font-black">{categoryCount}</strong>
                  <span className="text-xs text-white/60">دسته فعال</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
          <Card className="bg-white border-0 rounded-2xl shadow-xl">
            <CardContent className="p-4 md:p-5">
              <form className="grid grid-cols-1 md:grid-cols-[1fr_220px_160px] gap-3">
                <div className="relative">
                  <Search className="absolute right-4 top-4 h-4 w-4 text-gray-400" />
                  <Input
                    className="pr-11 h-12 rounded-xl bg-gray-50 border-gray-200"
                    placeholder={`جستجو در کسب‌وکارهای ${city.nameFa}...`}
                  />
                </div>
                <select className="h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 outline-none">
                  <option>همه دسته‌بندی‌ها</option>
                  {city.priorityCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <Button type="button" className="h-12 rounded-xl bg-[color:var(--lajvard)] text-white">
                  جستجو
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="space-y-5">
              <Card className="bg-white border-gray-100 rounded-2xl">
                <CardContent className="p-5">
                  <h2 className="font-black text-gray-900 mb-4">محله‌ها و محدوده‌ها</h2>
                  <div className="flex flex-wrap gap-2">
                    {city.neighborhoods.map((neighborhood) => (
                      <span key={neighborhood} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                        {neighborhood}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-2xl">
                <CardContent className="p-5">
                  <h2 className="font-black text-gray-900 mb-4">دسته‌های مهم در {city.nameFa}</h2>
                  <div className="space-y-2">
                    {city.priorityCategories.map((category) => (
                      <Link
                        key={category}
                        href="/categories"
                        className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm font-bold text-gray-600 hover:border-[color:var(--lajvard)] hover:text-[color:var(--lajvard)] transition"
                      >
                        <span>{category}</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[color:var(--lajvard)] text-white border-0 rounded-2xl">
                <CardContent className="p-5">
                  <Plus className="h-6 w-6 mb-4" />
                  <h2 className="font-black mb-3">کسب‌وکار شما در {city.nameFa} نیست؟</h2>
                  <p className="text-sm text-white/75 leading-relaxed mb-5">
                    پروفایل کسب‌وکارت را ثبت کن تا بعد از بررسی در دایرکتوری شهر نمایش داده شود.
                  </p>
                  <Button asChild className="w-full rounded-xl bg-white text-[color:var(--lajvard)] hover:bg-white/90">
                    <Link href={`/dashboard/business/new?city=${city.slug}`}>ثبت کسب‌وکار</Link>
                  </Button>
                </CardContent>
              </Card>
            </aside>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                <div>
                  <p className="text-sm font-bold text-[color:var(--lajvard)] mb-1">نتایج {city.nameFa}</p>
                  <h2 className="text-2xl font-black text-gray-900">کسب‌وکارهای منتشرشده</h2>
                </div>
                <p className="text-sm text-gray-500">
                  نمایش {cityBusinesses.length} نتیجه در {city.provinceFa}
                </p>
              </div>

              {cityBusinesses.length === 0 ? (
                <Card className="bg-white border-dashed border-gray-200 rounded-2xl">
                  <CardContent className="p-10 md:p-14 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-5" />
                    <h3 className="text-xl font-black text-gray-900 mb-3">
                      هنوز کسب‌وکاری برای {city.nameFa} منتشر نشده است.
                    </h3>
                    <p className="text-gray-500 leading-relaxed max-w-xl mx-auto mb-7">
                      این صفحه آماده است؛ به محض تایید اولین کسب‌وکار در این شهر، کارت‌ها همین‌جا نمایش داده می‌شوند.
                    </p>
                    <Button asChild className="rounded-xl bg-[color:var(--lajvard)] text-white">
                      <Link href={`/dashboard/business/new?city=${city.slug}`}>ثبت اولین کسب‌وکار {city.nameFa}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {cityBusinesses.map((business) => (
                    <Card key={business.id} className="bg-white border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="h-36 bg-gray-100 relative overflow-hidden">
                        {business.cover_url || business.logo_url ? (
                          <img
                            src={business.cover_url || business.logo_url || ""}
                            alt={business.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[linear-gradient(135deg,var(--lajvard),#800000)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute right-3 bottom-3 flex items-center gap-2 text-white text-xs font-bold">
                          <MapPin className="h-3.5 w-3.5 text-red-300" />
                          <span>{business.city || city.nameEn}، {business.province || city.province}</span>
                        </div>
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          <VerificationBadge
                            status={getVerificationStatus(business)}
                            audience="public"
                          />
                          {business.is_featured ? (
                            <span className="rounded-full bg-amber-500 text-white px-2 py-1 text-[10px] font-black inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              ویژه
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <p className="text-xs font-bold text-gray-400 mb-2">{business.category || "دسته‌بندی مشخص نشده"}</p>
                        <h3 className="text-lg font-black text-gray-900 mb-2">{business.name}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-5">
                          {business.short_description || business.description || "اطلاعات تکمیلی در صفحه اختصاصی کسب‌وکار قابل مشاهده است."}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {business.phone ? (
                              <a href={`tel:${business.phone}`} className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Phone className="h-4 w-4" />
                              </a>
                            ) : null}
                            {business.website ? (
                              <a href={business.website} target="_blank" rel="noreferrer" className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Globe className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                          <Button asChild size="sm" className="rounded-xl bg-gray-900 text-white hover:bg-[color:var(--lajvard)]">
                            <Link href={`/businesses/${business.slug || business.id}`}>مشاهده پروفایل</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

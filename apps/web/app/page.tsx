import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, ArrowLeft, Star, ShieldCheck, Bookmark, Navigation, MessageSquare, Plus, CheckCircle2, Download } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business/business-card";
import { HomeHero } from "@/components/home-hero";
import { SuggestionBox } from "@/components/suggestion-box";
import { STORES } from "@/lib/data/releases";

// The eight cities with generated background art. Kept here rather than read
// from lib/data/cities.ts because only these have images — a card whose
// background 404s is worse than no card.
const CITY_CARDS = [
  { slug: "toronto", nameFa: "تورنتو", nameEn: "Toronto" },
  { slug: "vancouver", nameFa: "ونکوور", nameEn: "Vancouver" },
  { slug: "montreal", nameFa: "مونترال", nameEn: "Montreal" },
  { slug: "calgary", nameFa: "کلگری", nameEn: "Calgary" },
  { slug: "ottawa", nameFa: "اتاوا", nameEn: "Ottawa" },
  { slug: "edmonton", nameFa: "ادمونتون", nameEn: "Edmonton" },
  { slug: "winnipeg", nameFa: "وینیپگ", nameEn: "Winnipeg" },
  { slug: "halifax", nameFa: "هلیفکس", nameEn: "Halifax" },
] as const;

// The app is built and runs, but is not on either store yet — that path is
// blocked on the Apple organization account. Store URLs live in
// lib/data/releases.ts; the direct APK is live today.
// on the day it ships; nothing else needs to change.
const APP_LIVE = !!(STORES.appStore || STORES.playStore);
const APP_STORE_URL = STORES.appStore;
const PLAY_STORE_URL = STORES.playStore;

export const metadata: Metadata = {
  title: "čārana | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const nowIso = new Date().toISOString();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(10);

  // Fetch 0. Featured businesses — the plan's homepage_slot feature
  // (lib/billing/plans.ts). Filtered here the same way entitlementsFor()
  // decides "featured": plan = 'featured' and not expired. That's a
  // performance filter, not the source of truth — BusinessCard recomputes
  // the entitlement itself from plan/plan_until before it renders the چیپ,
  // so a row that slipped past this query still can't wear an unearned
  // label. Section renders only when it actually has something to show:
  // an empty "ویژه" section would be the same broken promise as a search
  // box that doesn't search.
  const { data: featuredBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .eq("plan", "featured")
    .or(`plan_until.is.null,plan_until.gte.${nowIso}`)
    .order("plan_until", { ascending: true, nullsFirst: false })
    .limit(6);

  // Fetch 1. Newest verified businesses
  const { data: latestBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(6);

  // Fetch 2. Most visited businesses
  const { data: popularBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("view_count", { ascending: false })
    .limit(6);

  // Live numbers for the hero — every one is a real count, never a claim.
  const [{ count: totalCount }, { count: verifiedCount }, { data: cityRows }, { count: categoryCount }] =
    await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", ["APPROVED", "PUBLISHED"]),
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", ["APPROVED", "PUBLISHED"]).gt("verified_until", nowIso),
      supabase.from("businesses").select("city").in("status", ["APPROVED", "PUBLISHED"]).not("city", "is", null),
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);
  const cityCount = new Set((cityRows ?? []).map((r) => (r.city as string).trim().toLowerCase()).filter(Boolean)).size;
  const catLabel = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
  const stats = { total: totalCount ?? 0, verified: verifiedCount ?? 0, cities: cityCount, categories: categoryCount ?? 0 };
  const cityFreq = new Map<string, number>();
  for (const r of cityRows ?? []) { const c = (r.city as string).trim(); if (c) cityFreq.set(c, (cityFreq.get(c) ?? 0) + 1); }
  const topCities = [...cityFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c);

  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="min-h-screen">
        {/* 1 & 2. Hero — brand-first, live numbers, real search */}
        <HomeHero stats={stats} cities={topCities} />

        {/* 2b. Featured — the plan's homepage_slot. Only appears when someone
            actually holds it; see the fetch above for why an empty version of
            this section is not an option. */}
        {featuredBusinesses && featuredBusinesses.length > 0 && (
          <section className="border-t border-gray-100 bg-gradient-to-b from-amber-50/60 to-white px-4 py-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                    <Star className="h-3.5 w-3.5" fill="currentColor" /> ویژه
                  </div>
                  <h2 className="text-2xl font-bold md:text-3xl">کسب‌وکارهای ویژه</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    این‌ها جایگاه ویژه را خریده‌اند — با برچسب، نه پنهانی.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} categoryLabel={catLabel.get(biz.category)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. Popular Categories */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">دسته‌بندی‌های پرجستجو</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(categories || []).map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`} className="group block h-32 md:h-40 rounded-xl overflow-hidden relative shadow-sm hover:shadow-lg transition-all border border-gray-100">
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gray-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-xl md:text-2xl mb-1 drop-shadow-md">{category.icon}</div>
                    <h3 className="font-bold text-sm md:text-base drop-shadow-md">{category.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Section: Newest Verified Businesses */}
        {latestBusinesses && latestBusinesses.length > 0 && (
          <section className="py-16 px-4 bg-white border-t border-gray-100">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  {/* The heading used to read "newest *verified* businesses"
                      and the subtitle claimed each had been reviewed by the
                      team. Both were asserted over a query that filters on
                      publication status alone, so 677 imported listings were
                      described as verified. Say what the query actually
                      selects. */}
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">جدیدترین کسب‌وکارها</h2>
                  <p className="text-sm text-gray-500">تازه‌ترین کسب‌وکارهایی که در چارانا منتشر شده‌اند</p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:inline-flex text-[color:var(--lajvard)]">
                  <Link href="/categories/all">مشاهده همه <ArrowLeft className="mr-1 h-4 w-4" /></Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {latestBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} categoryLabel={catLabel.get(biz.category)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. Section: Most Visited Businesses */}
        {popularBusinesses && popularBusinesses.length > 0 && (
          <section className="py-16 px-4 bg-gray-50/70 border-t border-gray-100">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">پربازدیدترین کسب‌وکارها</h2>
                  <p className="text-sm text-gray-500">بیشترین بازدید در چارانا</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {popularBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} showViews categoryLabel={catLabel.get(biz.category)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. Explore by city */}
        <section className="border-t border-gray-100 bg-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold md:text-3xl">کاوش بر اساس شهر</h2>
              <p className="text-sm text-gray-500">
                کسب‌وکارهای ایرانی را در شهر خودت پیدا کن
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {CITY_CARDS.map((city) => (
                <Link
                  key={city.slug}
                  href={`/cities/${city.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  <Image
                    src={`/images/cities/${city.slug}.webp`}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />

                  {/* Two layers, not one. The flat wash keeps mid-tones off the
                      text; the bottom-weighted gradient anchors the name. A
                      single overlay either greys out the photograph or leaves
                      the name unreadable over a bright window. */}
                  <div className="absolute inset-0 bg-[#14213d]/45" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14213d] via-[#14213d]/40 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-lg font-black text-[#f6f1e8] drop-shadow-sm">
                      {city.nameFa}
                    </p>
                    <p className="text-xs text-[#f6f1e8]/70" dir="ltr">
                      {city.nameEn}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
                <Link href="/cities">
                  همه‌ی شهرها <ArrowLeft className="mr-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 6. Business Owner Path */}
        <section className="py-20 px-4 bg-[color:var(--lajvard)] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-6">کسب‌وکار ایرانی داری؟ در čārana معرفی‌اش کن.</h2>
            <p className="text-lg text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
              اگر صاحب یا نماینده یک کسب‌وکار ایرانی در کانادا هستی، می‌توانی پروفایل کسب‌وکارت را ثبت کنی تا بعد از بررسی در دایرکتوری منتشر شود.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12 text-sm font-bold">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">1</div>
                <span>حساب بساز</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">2</div>
                <span>اطلاعات وارد کن</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">3</div>
                <span>تیم ما بررسی می‌کند</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">4</div>
                <span>منتشر می‌شود</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild className="bg-white text-[color:var(--lajvard)] hover:bg-gray-100 font-bold px-8 h-14 text-base">
                <Link href="/dashboard/business/new">شروع ثبت کسب‌وکار</Link>
              </Button>
              <Button asChild variant="muted" className="border-white text-[color:var(--lajvard)] hover:bg-white/10 hover:text-white font-bold px-8 h-14 text-base">
                <Link href="/auth/login">ورود به حساب</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 6b. Ask the visitor what is missing — text or voice */}
        <section className="px-4 py-16 bg-white border-t border-gray-100">
          <div className="mx-auto max-w-3xl">
            <SuggestionBox page="/" />
          </div>
        </section>

        {/* 7. Why Charana */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">چرا čārana؟</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[color:var(--lajvard-light)]/20 text-[color:var(--lajvard)] rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">تمرکز اختصاصی</h3>
                <p className="text-gray-600 text-sm leading-relaxed">مرجع تخصصی کسب‌وکارهای ایرانیان کانادا، بدون نتایج نامربوط.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[color:var(--lajvard-light)]/20 text-[color:var(--lajvard)] rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">جستجوی دقیق</h3>
                <p className="text-gray-600 text-sm leading-relaxed">پیدا کردن سریع خدمات بر اساس شهر، دسته‌بندی و کلمات کلیدی.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[color:var(--lajvard-light)]/20 text-[color:var(--lajvard)] rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">ثبت و Claim</h3>
                <p className="text-gray-600 text-sm leading-relaxed">امکان ثبت آسان کسب‌وکار جدید یا Claim کردن پروفایل از پیش موجود.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[color:var(--lajvard-light)]/20 text-[color:var(--lajvard)] rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">بررسی دستی</h3>
                <p className="text-gray-600 text-sm leading-relaxed">جلوگیری از اسپم با بررسی و تایید انسانی پروفایل‌ها قبل از انتشار.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Trust & Policy */}
        <section className="py-16 px-4 bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">اطلاعات قابل اعتماد، انتشار کنترل‌شده</h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              در <strong dir="ltr">čārana</strong> اطلاعات کسب‌وکارها قبل از انتشار بررسی می‌شود. نظرهای عمومی کاربران هم فقط بعد از تایید مدیر نمایش داده می‌شوند. یادداشت‌ها و ذخیره‌های شخصی کاربران خصوصی می‌مانند مگر خودشان تصمیم بگیرند نسخه‌ای از تجربه‌شان را برای انتشار عمومی ارسال کنند.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm font-medium">
              <Link href="/privacy" className="text-[color:var(--lajvard)] hover:underline">حریم خصوصی</Link>
              <Link href="/disclaimer" className="text-[color:var(--lajvard)] hover:underline">سلب مسئولیت</Link>
              <Link href="/terms" className="text-[color:var(--lajvard)] hover:underline">شرایط استفاده</Link>
            </div>
          </div>
        </section>

        {/* 9. The app — a working miniature of the real UI, not a dead frame */}
        <section className="relative overflow-hidden bg-[#14213d] px-4 py-24 text-[#f6f1e8]">
          <style>{`
            @keyframes app-float { 0%,100% { transform: rotate(-5deg) translateY(0); } 50% { transform: rotate(-5deg) translateY(-10px); } }
            @keyframes chip-float-a { 0%,100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(-8deg) translateY(-7px); } }
            @keyframes chip-float-b { 0%,100% { transform: rotate(6deg) translateY(0); } 50% { transform: rotate(6deg) translateY(-12px); } }
            @media (prefers-reduced-motion: reduce) {
              .app-float, .chip-float-a, .chip-float-b { animation: none !important; }
            }
          `}</style>

          {/* One warm glow behind the phone instead of wallpaper texture. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#800000]/25 blur-[130px] md:left-[28%]" />
          {/* A single stepped horizon along the base — the parapet drawn once,
              as a line, not repeated as a pattern. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(to top, #f6f1e8 0, #f6f1e8 100%)",
              maskImage:
                "repeating-linear-gradient(90deg, black 0 48px, transparent 48px 96px), linear-gradient(to top, black 0 16px, transparent 16px 32px, black 32px 48px, transparent 48px)",
              WebkitMaskComposite: "source-in",
              maskComposite: "intersect",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-2">
            {/* The phone: the actual app, in miniature. Built from the same
                pieces the product ships — search, cards, the verified badge —
                because the app exists and this is what it looks like. */}
            <div className="relative mx-auto w-[270px]">
              <div
                className="app-float relative rounded-[2.6rem] border-[6px] border-[#0d1730] bg-[#0d1730] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]"
                style={{ animation: "app-float 7s ease-in-out infinite" }}
                dir="rtl"
              >
                <div className="overflow-hidden rounded-[2.2rem] bg-[#f6f1e8]">
                  {/* status strip + notch */}
                  <div className="relative flex h-8 items-center justify-center bg-[#f6f1e8]">
                    <div className="h-5 w-24 rounded-full bg-[#0d1730]" />
                  </div>

                  {/* app header */}
                  <div className="flex items-center justify-between px-4 pb-2 pt-1">
                    <span className="text-lg font-black text-[#800000]">چارانا</span>
                    <span className="rounded-full bg-[#14213d]/5 px-2 py-1 text-[9px] font-bold text-[#14213d]">تورنتو ▾</span>
                  </div>

                  {/* search */}
                  <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                    <Search className="h-3.5 w-3.5 text-[#5f6472]" />
                    <span className="text-[10px] text-[#5f6472]">دنبال چه کسب‌وکاری می‌گردی؟</span>
                  </div>

                  {/* category row */}
                  <div className="mb-3 flex gap-1.5 px-4">
                    {["رستوران", "پزشک", "وکیل", "املاک"].map((c, i) => (
                      <span
                        key={c}
                        className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                          i === 0 ? "bg-[#800000] text-[#f6f1e8]" : "bg-white text-[#14213d]"
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* two mini business cards */}
                  {[
                    { name: "رستوران شب‌های شیراز", cat: "رستوران و کافه", badge: true },
                    { name: "دکتر آرین مهر", cat: "دندانپزشک", badge: false },
                  ].map((b) => (
                    <div key={b.name} className="mx-4 mb-2.5 rounded-xl bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6f1e8] text-[11px] font-black text-[#800000]">
                          {b.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-[#14213d]">{b.name}</p>
                          <p className="text-[9px] text-[#5f6472]">{b.cat}</p>
                        </div>
                        <Star className="h-3.5 w-3.5 shrink-0 text-[#c9a24b]" fill="#c9a24b" />
                      </div>
                      {b.badge && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#800000] px-1.5 py-0.5 text-[8px] font-bold text-[#f6f1e8]">
                          <ShieldCheck className="h-2.5 w-2.5" /> مالکیت احرازشده
                        </span>
                      )}
                    </div>
                  ))}

                  {/* bottom nav */}
                  <div className="mt-1 flex items-center justify-around border-t border-[#14213d]/8 bg-white px-4 py-2.5">
                    <Search className="h-4 w-4 text-[#800000]" />
                    <Bookmark className="h-4 w-4 text-[#5f6472]" />
                    <MessageSquare className="h-4 w-4 text-[#5f6472]" />
                    <div className="h-4 w-4 rounded-full bg-[#5f6472]/30" />
                  </div>
                </div>
              </div>

              {/* floating proof chips */}
              <div
                className="chip-float-a absolute -right-14 top-14 rounded-xl bg-[#f6f1e8] px-3 py-2 text-[10px] font-black text-[#14213d] shadow-xl"
                style={{ animation: "chip-float-a 5.5s ease-in-out infinite" }}
              >
                +۶۷۷ کسب‌وکار
              </div>
              <div
                className="chip-float-b absolute -left-16 bottom-24 flex items-center gap-1 rounded-xl bg-[#800000] px-3 py-2 text-[10px] font-black text-[#f6f1e8] shadow-xl"
                style={{ animation: "chip-float-b 6.5s ease-in-out infinite" }}
              >
                <ShieldCheck className="h-3 w-3" /> تایید با پیامک
              </div>
            </div>

            {/* copy */}
            <div dir="rtl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/40 bg-[#c9a24b]/10 px-4 py-1.5 text-xs font-bold text-[#c9a24b]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c9a24b] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c9a24b]" />
                </span>
                نسخه‌ی اندروید آماده است — استورها در راه
              </span>

              <h2 className="mb-5 text-3xl font-black leading-[1.25] md:text-5xl">
                چارانا توی جیبت،
                <br />
                <span className="text-[#c9a24b]">هرجای کانادا که باشی</span>
              </h2>

              <ul className="mb-9 space-y-4 text-[#f6f1e8]/80">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <Bookmark className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">
                    کسب‌وکارها را ذخیره کن و لیست «می‌خواهم بروم» بساز
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <MessageSquare className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">
                    یادداشت خصوصی بنویس — فقط خودت می‌بینی، حتی ما هم نه
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <ShieldCheck className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">
                    نشان تایید یعنی مالکیت با پیامک به شماره‌ی خود آگهی اثبات شده
                  </span>
                </li>
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <a href={STORES.apkDirect} className="inline-flex items-center gap-2 rounded-2xl bg-[#c9a24b] px-6 py-3.5 font-bold text-[#14213d] transition hover:-translate-y-0.5 hover:bg-[#e6c877]">
                  <Download className="h-4 w-4" /> دانلود مستقیم APK
                  <span className="text-[11px] font-normal opacity-70" dir="ltr">v{STORES.apkVersion}</span>
                </a>
                {APP_LIVE ? (
                  <>
                    {APP_STORE_URL ? <Link href={APP_STORE_URL} className="rounded-2xl bg-[#f6f1e8] px-7 py-3.5 font-bold text-[#14213d] transition hover:-translate-y-0.5">App Store</Link> : null}
                    {PLAY_STORE_URL ? <Link href={PLAY_STORE_URL} className="rounded-2xl bg-[#f6f1e8] px-7 py-3.5 font-bold text-[#14213d] transition hover:-translate-y-0.5">Google Play</Link> : null}
                  </>
                ) : (
                  /* Not links on purpose: the app is on no store yet, and a
                     store button that goes nowhere is the same broken promise
                     as a search box that does not search. */
                  <>
                    {["App Store", "Google Play"].map((store) => (
                      <span
                        key={store}
                        className="flex cursor-default flex-col items-center rounded-2xl border border-[#f6f1e8]/15 bg-[#f6f1e8]/5 px-7 py-2.5 backdrop-blur-sm"
                      >
                        <span className="text-[10px] text-[#f6f1e8]/50">به‌زودی در</span>
                        <span className="font-bold text-[#f6f1e8]/85" dir="ltr">{store}</span>
                      </span>
                    ))}
                    <Link href="/download" className="text-sm text-[#f6f1e8]/70 underline underline-offset-4 hover:text-[#f6f1e8]">
                      همه‌ی راه‌های دانلود →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

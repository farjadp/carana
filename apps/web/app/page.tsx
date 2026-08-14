import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, ArrowLeft, Star, ShieldCheck, Bookmark, Navigation, MessageSquare, Plus, CheckCircle2 } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business/business-card";

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
// blocked on the Apple organization account. Flip this and fill the two URLs
// on the day it ships; nothing else needs to change.
const APP_LIVE = false;
const APP_STORE_URL = "";
const PLAY_STORE_URL = "";

export const metadata: Metadata = {
  title: "čārana | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(10);

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

  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="min-h-screen">
        {/* 1 & 2. Hero Section */}
        <section className="bg-gradient-to-b from-[color:var(--lajvard-light)]/10 to-transparent py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 leading-tight">
              کسب‌وکارهای ایرانیان کانادا را پیدا کن
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              <strong dir="ltr" className="font-bold">čārana</strong> دایرکتوری کسب‌وکارهای ایرانی در کاناداست؛ از رستوران و کلینیک تا وکیل، مشاور، فروشگاه و خدمات محلی.
            </p>

            <Card className="max-w-3xl mx-auto shadow-xl border-gray-100 bg-white">
              <CardContent className="p-3 md:p-4">
                <form className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder="نام کسب‌وکار، خدمت یا دسته‌بندی..." 
                      className="pr-10 h-12 text-base w-full bg-gray-50 border-gray-200"
                    />
                  </div>
                  <div className="md:w-1/3 relative">
                    <MapPin className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    <select className="flex h-12 w-full rounded-md border border-gray-200 bg-gray-50 px-10 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">همه شهرها</option>
                      <option value="toronto">تورنتو (Toronto)</option>
                      <option value="vancouver">ونکوور (Vancouver)</option>
                      <option value="montreal">مونترال (Montreal)</option>
                    </select>
                  </div>
                  <Button type="button" className="h-12 px-8 bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white text-base">
                    جستجو
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4 text-sm">
              <div className="flex items-center text-gray-500 gap-1.5 bg-white py-1 px-3 rounded-full shadow-sm border border-gray-100">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>اطلاعات کسب‌وکارها قبل از انتشار بررسی می‌شود</span>
              </div>
              <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
                <Link href="/dashboard/business/new">ثبت کسب‌وکار من <Plus className="mr-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

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
                  <BusinessCard key={biz.id} business={biz} />
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
                  <BusinessCard key={biz.id} business={biz} showViews />
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

        {/* 9. The app */}
        <section className="relative overflow-hidden bg-[#14213d] px-4 py-20 text-[#f6f1e8]">
          {/* Stepped bands: the Achaemenid parapet rhythm from the brand book,
              used as texture rather than as an illustrated monument. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #f6f1e8 0 14px, transparent 14px 28px), repeating-linear-gradient(0deg, #f6f1e8 0 14px, transparent 14px 56px)",
            }}
          />

          <div className="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <span className="mb-4 inline-block rounded-full bg-[#c9a24b]/20 px-3 py-1 text-xs font-bold text-[#c9a24b]">
                به‌زودی
              </span>

              <h2 className="mb-4 text-3xl font-black leading-tight md:text-4xl">
                چارانا همیشه همراهت
              </h2>

              <p className="mb-8 max-w-xl leading-relaxed text-[#f6f1e8]/75">
                کسب‌وکارهای اطرافت را پیدا کن، ذخیره کن و یادداشت‌های خصوصی‌ات را
                نگه دار. اپلیکیشن ساخته شده و در حال آماده‌سازی برای انتشار در
                اپ‌استور و گوگل‌پلی است.
              </p>

              <div className="flex flex-wrap gap-3">
                {/* Deliberately not links. The app is built but not published,
                    and a store button that goes nowhere is the same broken
                    promise as a search box that does not search. When the
                    listings are live, APP_LIVE flips and these become real. */}
                {APP_LIVE ? (
                  <>
                    <Link href={APP_STORE_URL} className="rounded-xl bg-[#f6f1e8] px-6 py-3 font-bold text-[#14213d]">
                      App Store
                    </Link>
                    <Link href={PLAY_STORE_URL} className="rounded-xl bg-[#f6f1e8] px-6 py-3 font-bold text-[#14213d]">
                      Google Play
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="cursor-default rounded-xl border border-[#f6f1e8]/25 px-6 py-3 font-bold text-[#f6f1e8]/50">
                      App Store — به‌زودی
                    </span>
                    <span className="cursor-default rounded-xl border border-[#f6f1e8]/25 px-6 py-3 font-bold text-[#f6f1e8]/50">
                      Google Play — به‌زودی
                    </span>
                  </>
                )}
              </div>

              <p className="mt-6 text-sm text-[#f6f1e8]/60">
                تا آن موقع، همه‌ی امکانات در همین سایت روی موبایل کار می‌کند.
              </p>
            </div>

            {/* A device outline built from brand geometry rather than a
                photograph of a phone with a fake screenshot inside it. */}
            <div className="mx-auto hidden h-[380px] w-[190px] shrink-0 rounded-[2rem] border-4 border-[#f6f1e8]/20 bg-[#800000]/20 p-3 md:block">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.4rem] bg-[#f6f1e8]/5">
                <span className="text-4xl font-black text-[#f6f1e8]/30">č</span>
                <span className="mt-2 text-xs text-[#f6f1e8]/25">čārana</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

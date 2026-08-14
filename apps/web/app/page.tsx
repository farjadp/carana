import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, ArrowLeft, Star, ShieldCheck, Bookmark, Navigation, MessageSquare, Plus, CheckCircle2 } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">جدیدترین کسب‌وکارهای تایید شده</h2>
                  <p className="text-sm text-gray-500">کسب‌وکارهایی که اخیراً پس از بررسی تیم چارانا در سیستم منتشر شده‌اند</p>
                </div>
                <Button asChild variant="ghost" className="hidden sm:inline-flex text-[color:var(--lajvard)]">
                  <Link href="/categories/all">مشاهده همه <ArrowLeft className="mr-1 h-4 w-4" /></Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestBusinesses.map((biz) => (
                  <Card key={biz.id} className="overflow-hidden hover:shadow-lg transition-shadow border-gray-100 rounded-2xl flex flex-col justify-between">
                    <CardContent className="p-0 flex flex-col h-full justify-between">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> تایید شده
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {biz.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-gray-900">{biz.name}</h3>
                        <div className="flex items-center text-gray-500 text-xs mb-3">
                          <MapPin className="ml-1.5 h-3.5 w-3.5 text-red-500" />
                          <span>{biz.city || "شهر مشخص نشده"}، {biz.province || "کانادا"}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                          {biz.short_description || biz.description || "اطلاعات تکمیلی در صفحه اختصاصی موجود است."}
                        </p>
                      </div>
                      <div className="p-6 pt-0">
                        <Button asChild variant="muted" className="w-full rounded-xl text-xs bg-gray-900 text-white hover:bg-[color:var(--lajvard)]">
                          <Link href={`/businesses/${biz.slug || biz.id}`}>مشاهده پروفایل</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
                  <p className="text-sm text-gray-500">کسب‌وکارهایی که بیشترین آمار بازدید و توجه مخاطبان را در چارانا داشته‌اند</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularBusinesses.map((biz) => (
                  <Card key={biz.id} className="overflow-hidden hover:shadow-lg transition-shadow border-gray-100 bg-white rounded-2xl flex flex-col justify-between">
                    <CardContent className="p-0 flex flex-col h-full justify-between">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
                            پربازدید
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {biz.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-gray-900">{biz.name}</h3>
                        <div className="flex items-center text-gray-500 text-xs mb-3">
                          <MapPin className="ml-1.5 h-3.5 w-3.5 text-red-500" />
                          <span>{biz.city || "شهر مشخص نشده"}، {biz.province || "کانادا"}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                          {biz.short_description || biz.description || "اطلاعات تکمیلی در صفحه اختصاصی موجود است."}
                        </p>
                      </div>
                      <div className="p-6 pt-0">
                        <Button asChild variant="muted" className="w-full rounded-xl text-xs bg-gray-900 text-white hover:bg-[color:var(--lajvard)]">
                          <Link href={`/businesses/${biz.slug || biz.id}`}>مشاهده پروفایل</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. Active Cities */}
        <section className="py-16 px-4 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">جستجو بر اساس شهر</h2>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Halifax'].map((city) => (
                <Button key={city} asChild variant="muted" className="bg-white hover:border-[color:var(--lajvard)] hover:text-[color:var(--lajvard)] h-12 px-6 rounded-full font-medium">
                  <Link href={`/cities/${city.toLowerCase()}`}>
                    <MapPin className="ml-2 h-4 w-4" />
                    {city}
                  </Link>
                </Button>
              ))}
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

        {/* 9. Coming Soon / Roadmap */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 flex items-center justify-center gap-2">
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider">نقشه راه</span>
              به‌زودی در پروفایل کاربری
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <Bookmark className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">ذخیره کسب‌وکارها</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">لیست شخصی برای مراجعه بعدی</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <Navigation className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">لیست «می‌خواهم بروم»</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">نشان‌گذاری مکان‌های جدید برای بازدید</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">یادداشت خصوصی</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">ثبت نظر متنی، صوتی و تصویری</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <Star className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">امتیازدهی و نظردهی</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">نظرهای تاییدشده عمومی برای راهنمایی بقیه</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 sm:col-span-2 md:col-span-1">
                <ShieldCheck className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Claim کسب‌وکار</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">مدیریت مستقیم پروفایل توسط صاحبان مشاغل</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

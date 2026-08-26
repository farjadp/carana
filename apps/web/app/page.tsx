// ============================================================================
// Source: app/page.tsx
// Version: 2.1.0 — 2026-08-24
// Why: The home page. v2 is a redesign around the one job a directory home
//      page has — get someone to the right business — after Farjad flagged it
//      as repetitive and unfocused. What was actually wrong, and what changed:
//
//      DUPLICATION (the complaint, and it was real)
//        • "جدیدترین" and "پربازدیدترین" were two identical 6-card grids run
//          back to back, and on today's data the *same three* businesses
//          filled both. Popular is now deduplicated against newest, so the
//          two sections can never restate each other.
//        • The owner CTA appeared three times (hero, sticky header, dedicated
//          section). Removed from the hero; the header carries it everywhere
//          and the dedicated section explains it properly.
//        • "چرا GOPLAZA؟" (4 cards) and "اطلاعات قابل اعتماد" (a paragraph)
//          were the same trust argument told twice. Merged into one section.
//        • The three legal links were repeated here and in the footer, which
//          renders directly beneath. Kept the footer's.
//
//      BROKEN LINK
//        • "مشاهده همه" pointed at /categories/all, which is not a route —
//          `categories/[slug]` has no "all" case, so it 404s. Now /businesses,
//          which is the real full paginated listing.
//
//      STALE CLAIM
//        • The app mock's floating chip hard-coded "+۶۷۷ کسب‌وکار" while the
//          hero counted 680 from the database on the same screen. It takes
//          the live count now — same rule as every other number here.
//
//      ORDER
//        • Categories moved directly under the hero: browsing by category is
//          the main path for a visitor who does not have a search term ready,
//          and it used to sit below two conditional sections that are empty
//          on most days.
// Env / Identity: Server Component. Public reads only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, ArrowLeft, Star, ShieldCheck, Bookmark, MessageSquare, CheckCircle2, Download, Megaphone, Users } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { plansWith } from "@goplaza/core";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business/business-card";
import { HomeHero } from "@/components/home-hero";
import { SuggestionBox } from "@/components/suggestion-box";
import { HomeLatestPosts } from "@/components/blog/latest-posts";
import { HomeChannels } from "@/components/channels/home-channels";
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
const APP_LIVE = !!(STORES.appStore || STORES.playStore);
const APP_STORE_URL = STORES.appStore;
const PLAY_STORE_URL = STORES.playStore;

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number) => String(n).replace(/\d/g, (d) => FA[Number(d)]);

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "GOPLAZA | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
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

  // Featured businesses — every plan that holds the `homepage_slot` feature,
  // asked of plans.ts rather than typed here. It used to say
  // `.eq("plan", "featured")` under a comment claiming it mirrored
  // entitlementsFor(); it did not, because Platinum holds homepage_slot too,
  // so the most expensive tier was excluded from the slot it pays for. The
  // bug was unobservable while nobody held the tier (24 Aug 2026).
  //
  // Still a performance filter, not the source of truth — BusinessCard
  // recomputes the entitlement from plan/plan_until before it renders the
  // چیپ, so a row that slipped past this query still cannot wear an unearned
  // label. Section renders only when it actually has something to show: an
  // empty "ویژه" section would be the same broken promise as a search box
  // that doesn't search.
  const { data: featuredBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .in("plan", plansWith("homepage_slot"))
    .or(`plan_until.is.null,plan_until.gte.${nowIso}`)
    .order("plan_until", { ascending: true, nullsFirst: false })
    .limit(6);

  // Newest announcements sitewide — how a visitor who follows no one in
  // particular finds out anything got posted at all. Capped at 10, scoped to
  // businesses that are actually public and announcements that haven't
  // expired, same rule as the profile banner.
  const { data: latestAnnouncements } = await supabase
    .from("business_announcements")
    .select("id, title, body, created_at, business:businesses!inner(id, name, slug, logo_url, status)")
    .in("business.status", ["APPROVED", "PUBLISHED"])
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: latestBusinesses } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(6);

  // Over-fetched on purpose: the six newest are removed below, so asking for
  // exactly six here would leave the "most visited" row short (or empty) on a
  // young directory where the newest listings are also the most viewed.
  const { data: popularPool } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("view_count", { ascending: false })
    .limit(18);

  // Live numbers for the hero — every one is a real count, never a claim.
  // Shared with the auth panel through one helper so the two never disagree.
  const directory = await getDirectoryStats();
  const catLabel = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
  const stats = { total: directory.total, verified: directory.verified, cities: directory.cities, categories: directory.categories };
  const topCities = directory.topCities.slice(0, 12);

  // The fix for the repetition Farjad saw: a business already shown as "newest"
  // never appears again as "most visited". Two sections that restate each
  // other are worse than one.
  const latestIds = new Set((latestBusinesses ?? []).map((b) => b.id as string));
  const popularBusinesses = (popularPool ?? [])
    .filter((b) => !latestIds.has(b.id as string) && (b.view_count ?? 0) > 0)
    .slice(0, 6);

  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="min-h-screen">
        {/* 1. Hero — search-first, live numbers */}
        <HomeHero stats={stats} cities={topCities} />

        {/* 2. Browse by category — the main path for someone without a search
            term ready, so it comes first after the hero. */}
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHead
              title="دنبال چه خدمتی می‌گردی؟"
              subtitle="دسته‌بندی‌های پرجستجوی گوپلازا"
              center
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {(categories || []).map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group relative block h-32 overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg md:h-40"
                >
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 h-full w-full bg-gray-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="mb-1 text-xl drop-shadow-md md:text-2xl">{category.icon}</div>
                    <h3 className="text-sm font-bold drop-shadow-md md:text-base">{category.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
                <Link href="/categories">همه‌ی دسته‌بندی‌ها <ArrowLeft className="mr-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 3. Featured — the plan's homepage_slot. Only appears when someone
            actually holds it; see the fetch above for why an empty version of
            this section is not an option. */}
        {featuredBusinesses && featuredBusinesses.length > 0 && (
          <section className="border-t border-gray-100 bg-gradient-to-b from-amber-50/60 to-white px-4 py-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                  <Star className="h-3.5 w-3.5" fill="currentColor" /> ویژه
                </div>
                <SectionHead
                  title="کسب‌وکارهای ویژه"
                  subtitle="این‌ها جایگاه ویژه را خریده‌اند — با برچسب، نه پنهانی."
                  bare
                />
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featuredBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} categoryLabel={catLabel.get(biz.category)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4. Newest announcements sitewide — absent when there are none,
            same rule as the featured section above it. */}
        {latestAnnouncements && latestAnnouncements.length > 0 && (
          <section className="border-t border-gray-100 bg-white px-4 py-16">
            <div className="mx-auto max-w-7xl">
              <SectionHead title="تازه‌ترین اعلان‌ها" subtitle="تخفیف، رویداد و خبر تازه از کسب‌وکارهای گوپلازا" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {latestAnnouncements.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/businesses/${a.business?.slug}`}
                    className="flex items-start gap-3 rounded-2xl border border-[color:var(--gold)]/25 bg-[color:var(--gold)]/6 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Megaphone size={16} className="mt-0.5 shrink-0 text-[color:var(--gold)]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[color:var(--lajvard)]">{a.business?.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm font-bold text-gray-900">{a.title}</p>
                      {a.body ? <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{a.body}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. Newest businesses. The heading used to read "newest *verified*"
            and claim each had been reviewed by the team — both asserted over a
            query that filters on publication status alone, which described 677
            imported listings as verified. Say what the query actually selects. */}
        {latestBusinesses && latestBusinesses.length > 0 && (
          <section className="border-t border-gray-100 bg-white px-4 py-16">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex items-end justify-between gap-4">
                <SectionHead title="جدیدترین کسب‌وکارها" subtitle="تازه‌ترین کسب‌وکارهایی که در گوپلازا منتشر شده‌اند" bare />
                <Button asChild variant="ghost" className="hidden shrink-0 text-[color:var(--lajvard)] sm:inline-flex">
                  <Link href="/businesses">مشاهده همه <ArrowLeft className="mr-1 h-4 w-4" /></Link>
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

        {/* 6. Most visited — deduplicated against the section above, and
            gated on a real view count, so this is never a second copy of it. */}
        {popularBusinesses.length > 0 && (
          <section className="border-t border-gray-100 bg-gray-50/70 px-4 py-16">
            <div className="mx-auto max-w-7xl">
              <SectionHead title="پربازدیدترین کسب‌وکارها" subtitle="بیشترین بازدید در گوپلازا" />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {popularBusinesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} showViews categoryLabel={catLabel.get(biz.category)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. Explore by city */}
        <section className="border-t border-gray-100 bg-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHead title="کاوش بر اساس شهر" subtitle="کسب‌وکارهای ایرانی را در شهر خودت پیدا کن" center />
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
                    <p className="text-lg font-black text-[#f6f1e8] drop-shadow-sm">{city.nameFa}</p>
                    <p className="text-xs text-[#f6f1e8]/70" dir="ltr">{city.nameEn}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
                <Link href="/cities">همه‌ی شهرها <ArrowLeft className="mr-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 8. Channels and groups. Renders nothing until something is
            published — see components/channels/home-channels.tsx. It sits
            above the blog because it is the other half of the same promise:
            the directory knows what is still there. */}
        <HomeChannels />

        {/* 9. The blog. It used to be reachable from one link inside one
            dropdown, so nothing written there was ever read. Renders nothing
            when no post is published — see components/blog/latest-posts.tsx. */}
        <HomeLatestPosts />

        {/* 10. Why this directory, and how it stays honest. Previously two
            sections — a four-card "چرا GOPLAZA؟" and a paragraph headed
            "اطلاعات قابل اعتماد" — making the same argument twice. */}
        <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHead
              title="چرا گوپلازا؟"
              subtitle="یک دایرکتوری که فقط چیزی را نشان می‌دهد که پشتش داده‌ی واقعی هست."
              center
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Why icon={<MapPin className="h-6 w-6" />} title="تمرکز اختصاصی">
                مرجع تخصصی کسب‌وکارهای ایرانیان کانادا، بدون نتایج نامربوط.
              </Why>
              <Why icon={<Search className="h-6 w-6" />} title="جستجوی فارسی‌فهم">
                نام، خدمت، دسته یا شهر — فارسی یا انگلیسی، حتی با کیبورد اشتباه.
              </Why>
              <Why icon={<ShieldCheck className="h-6 w-6" />} title="نشان تأیید واقعی">
                نشان یعنی مالکیت با پیامک یا ایمیل اثبات شده — فروشی نیست، و شش‌ماهه تازه می‌شود.
              </Why>
              <Why icon={<CheckCircle2 className="h-6 w-6" />} title="انتشار کنترل‌شده">
                پروفایل‌ها و نظرهای عمومی پیش از انتشار بررسی می‌شوند؛ یادداشت‌های شخصی خصوصی می‌مانند.
              </Why>
            </div>
          </div>
        </section>

        {/* 11. Business owner path */}
        <section className="relative overflow-hidden bg-[color:var(--lajvard)] px-4 py-20 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5" /> برای صاحبان کسب‌وکار
            </div>
            <h2 className="mb-5 text-3xl font-black md:text-4xl">کسب‌وکار ایرانی داری؟ در گوپلازا معرفی‌اش کن.</h2>
            <p className="mx-auto mb-12 max-w-2xl leading-relaxed text-white/90">
              ثبت رایگان است و همیشه رایگان می‌ماند. آدرس سایتت را بده — بقیه‌ی اطلاعات را خودمان می‌خوانیم و پر می‌کنیم.
            </p>

            <ol className="mb-12 grid grid-cols-2 gap-6 text-sm font-bold sm:grid-cols-4">
              {["حساب بساز", "اطلاعات وارد کن", "تیم ما بررسی می‌کند", "منتشر می‌شود"].map((step, i) => (
                <li key={step} className="flex flex-col items-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 tabular-nums">
                    {fa(i + 1)}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <Button asChild className="h-14 bg-white px-8 text-base font-bold text-[color:var(--lajvard)] hover:bg-gray-100">
              <Link href="/dashboard/business/new">شروع ثبت کسب‌وکار</Link>
            </Button>
          </div>
        </section>

        {/* 12. Ask the visitor what is missing — text or voice */}
        <section className="border-t border-gray-100 bg-white px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <SuggestionBox page="/" />
          </div>
        </section>

        {/* 13. The app — a working miniature of the real UI, not a dead frame */}
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
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A1831]/25 blur-[130px] md:left-[28%]" />
          {/* A single stepped horizon along the base — the parapet drawn once,
              as a line, not repeated as a pattern. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-[0.12]"
            style={{
              backgroundImage: "linear-gradient(to top, #f6f1e8 0, #f6f1e8 100%)",
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
                    <span className="text-lg font-black text-[#7A1831]">گوپلازا</span>
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
                          i === 0 ? "bg-[#7A1831] text-[#f6f1e8]" : "bg-white text-[#14213d]"
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f6f1e8] text-[11px] font-black text-[#7A1831]">
                          {b.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-[#14213d]">{b.name}</p>
                          <p className="text-[9px] text-[#5f6472]">{b.cat}</p>
                        </div>
                        <Star className="h-3.5 w-3.5 shrink-0 text-[#c9a24b]" fill="#c9a24b" />
                      </div>
                      {b.badge && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#7A1831] px-1.5 py-0.5 text-[8px] font-bold text-[#f6f1e8]">
                          <ShieldCheck className="h-2.5 w-2.5" /> مالکیت احرازشده
                        </span>
                      )}
                    </div>
                  ))}

                  {/* bottom nav */}
                  <div className="mt-1 flex items-center justify-around border-t border-[#14213d]/8 bg-white px-4 py-2.5">
                    <Search className="h-4 w-4 text-[#7A1831]" />
                    <Bookmark className="h-4 w-4 text-[#5f6472]" />
                    <MessageSquare className="h-4 w-4 text-[#5f6472]" />
                    <div className="h-4 w-4 rounded-full bg-[#5f6472]/30" />
                  </div>
                </div>
              </div>

              {/* Floating proof chips. The count is the live one — this chip
                  used to hard-code "+۶۷۷" while the hero counted 680 from the
                  database on the same screen. */}
              <div
                className="chip-float-a absolute -right-14 top-14 rounded-xl bg-[#f6f1e8] px-3 py-2 text-[10px] font-black text-[#14213d] shadow-xl"
                style={{ animation: "chip-float-a 5.5s ease-in-out infinite" }}
              >
                {fa(stats.total)} کسب‌وکار
              </div>
              <div
                className="chip-float-b absolute -left-16 bottom-24 flex items-center gap-1 rounded-xl bg-[#7A1831] px-3 py-2 text-[10px] font-black text-[#f6f1e8] shadow-xl"
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
                گوپلازا توی جیبت،
                <br />
                <span className="text-[#c9a24b]">هرجای کانادا که باشی</span>
              </h2>

              <ul className="mb-9 space-y-4 text-[#f6f1e8]/80">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <Bookmark className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">کسب‌وکارها را ذخیره کن و لیست «می‌خواهم بروم» بساز</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <MessageSquare className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">یادداشت خصوصی بنویس — فقط خودت می‌بینی، حتی ما هم نه</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f1e8]/10">
                    <ShieldCheck className="h-4 w-4 text-[#c9a24b]" />
                  </span>
                  <span className="leading-relaxed">نشان تایید یعنی مالکیت با پیامک به شماره‌ی خود آگهی اثبات شده</span>
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

/** One heading shape for every section, so eleven sections read as one page.
 *  `bare` drops the wrapper margin for headings that sit inside a flex row. */
function SectionHead({
  title,
  subtitle,
  center,
  bare,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  bare?: boolean;
}) {
  return (
    <div className={`${bare ? "" : "mb-8"} ${center ? "text-center" : ""}`}>
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

function Why({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--lajvard-light)]/20 text-[color:var(--lajvard)]">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{children}</p>
    </div>
  );
}

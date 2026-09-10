// ============================================================================
// Source: app/page.tsx
// Version: 3.0.0 — 2026-09-09
// Why: The home page. One job: get someone to the right business.
//
//      v2 (24 Aug) removed the duplication Farjad flagged — two identical
//      card grids, an owner CTA that appeared three times, a trust argument
//      told twice, a "مشاهده همه" that 404'd, and a hard-coded business count
//      beside a live one.
//
//      v3 (9 Sep) is a UX pass over the LIVE page, and every item below is
//      something the rendered HTML was doing on that day, not something the
//      source suggested it might.
//
//      HONESTY (the house rule, three fresh violations)
//        • «دسته‌بندی‌های پرجستجوی پلازا» sat over a list ordered by
//          `display_order`. Nothing about it was search-derived. Relabelled.
//        • The hero's «پرجستجو:» chips were a hard-coded array; they now come
//          from the search log, and relabel themselves «مثلاً:» when the
//          aggregate is unavailable. See components/home-hero.tsx v3.
//        • «۱۷ مالکیت احرازشده» in gold beside «۹۶۹۳ کسب‌وکار» — true, and a
//          worse first impression than the number deserves. `verified` moved
//          to the search filter that already exists; the hero's fourth stat is
//          now `updatedThisWeek`.
//
//      A BUG THE PAGE HAD SHIPPED
//        • The categories query carried `.limit(10)` and its rows were also
//          the source of `catLabel`. There are 12 active categories, so two of
//          them had no label and every card in them printed its raw slug:
//          six cards on the live home page read «digital-it». The query now
//          fetches all categories for the map and the grid takes the first ten.
//
//      SECTIONS THAT ANNOUNCED THEIR OWN EMPTINESS
//        • «ویژه» rendered two cards into a three-column grid, and
//          «تازه‌ترین اعلان‌ها» rendered one into another. Both now pick a
//          layout from their own length, and both live inside one band —
//          «همین حالا در پلازا» — instead of two.
//        • «جدیدترین» and «پربازدیدترین» were two headings over two rails of
//          the same object. One section, two tabs (components/home/business-tabs).
//
//      THE DIRECTORY LISTING ITSELF
//        • Of the eight businesses shown above the fold, three were the
//          founder's: ویزا رودز and آشاوید held both «ویژه» slots, and آشاوید,
//          فرجاد پورمحمد and ویزا رودز sat 1st, 3rd and 4th in
//          «پربازدیدترین». Internal listings are now excluded from the two
//          promotional slots and unchanged everywhere else — see
//          lib/data/internal-businesses.ts.
//
//      PLACE
//        • Cities were eight hard-coded cards while `topCities` — real, ranked,
//          already fetched — was thrown away, so Richmond Hill (763 listings),
//          North York and Thornhill never appeared. They come from the geo
//          index now, with Persian names and real counts.
//        • New: category × city links with real counts, the shape of query
//          people actually have («دندانپزشک در نورث ونکوور»).
//
//      LENGTH
//        • The page was ~8,550px of twelve sections. The merges above, a
//          shorter blog rail, and dropping the home page's own suggestion box
//          — it is already on the zero-result search page, where someone has
//          just discovered something is missing — bring it to nine.
// Env / Identity: Server Component. Public reads only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bookmark, Download, Megaphone, MessageSquare, Search, ShieldCheck, Star, Users } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { plansWith } from "@goplaza/core";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business/business-card";
import { BusinessTabs, type BusinessTab } from "@/components/home/business-tabs";
import { HomeHero } from "@/components/home-hero";
import { HomeLatestPosts } from "@/components/blog/latest-posts";
import { HomeChannels } from "@/components/channels/home-channels";
import { withoutInternal } from "@/lib/data/internal-businesses";
import { detectVisitorCity } from "@/lib/geo/visitor-city";
import { cityCategoryCount, getGeoIndex } from "@/lib/seo/geo-index";
import { topSearches } from "@/lib/search";
import { STORES } from "@/lib/data/releases";
import { faDigits as fa, faNumber } from "@goplaza/core";

/**
 * City slugs with generated background art. A card whose background 404s is
 * worse than no card, so a city outside this set gets the flat brand tile
 * instead of a broken image — it still appears, which is the point: the list
 * is now ranked by real listing counts, not by which eight we drew.
 */
const CITY_ART = new Set([
  "toronto", "vancouver", "montreal", "calgary",
  "ottawa", "edmonton", "winnipeg", "halifax",
]);

// The app is built and runs, but is not on either store yet — that path is
// blocked on the Apple organization account. Store URLs live in
// lib/data/releases.ts; the direct APK is live today.
const APP_LIVE = !!(STORES.appStore || STORES.playStore);
const APP_STORE_URL = STORES.appStore;
const PLAY_STORE_URL = STORES.playStore;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "GOPLAZA | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
};

/**
 * Grid columns chosen from how many cards there actually are. A three-column
 * grid holding one card is a section advertising its own emptiness, which is
 * what «تازه‌ترین اعلان‌ها» was doing on the live page.
 */
function gridFor(n: number): string {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const nowIso = new Date().toISOString();

  // No `.limit()`: these rows are the label map for every card on the page,
  // and a truncated map is how «digital-it» reached the live home page. The
  // grid below takes the first ten; the map keeps all of them.
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

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
  const { data: featuredPool } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .in("plan", plansWith("homepage_slot"))
    .or(`plan_until.is.null,plan_until.gte.${nowIso}`)
    .order("plan_until", { ascending: true, nullsFirst: false })
    .limit(12);

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
    .limit(6);

  const { data: latestPool } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(12);

  // Over-fetched on purpose: the newest rows and our own listings are removed
  // below, so asking for exactly six here would leave the "most visited" tab
  // short on a young directory where the newest listings are also the most
  // viewed.
  const { data: popularPool } = await supabase
    .from("businesses")
    .select("*")
    .or("status.eq.APPROVED,status.eq.PUBLISHED")
    .order("view_count", { ascending: false })
    .limit(30);

  // Live numbers for the hero — every one is a real count, never a claim.
  // Shared with the auth panel through one helper so the two never disagree.
  const [directory, geo, popularTerms] = await Promise.all([
    getDirectoryStats(),
    getGeoIndex(),
    // 30 days, not the function's 90. The chips seeded their own log until
    // 10 Sep (see components/home-hero.tsx v3.1) and those rows cannot be
    // told apart from typed queries after the fact, so the only way to be rid
    // of them is to let them fall out of the window. A month does that by
    // ~10 Oct instead of ~9 Dec, and a month is a better read of what people
    // want from a directory anyway — «شب یلدا» should not still be ranking in
    // February. Widen it once the history is clean and the traffic supports it.
    topSearches(supabase, 6, 30),
  ]);
  // Must follow getGeoIndex(): a city is only offered once we know we have
  // listings there.
  const visitorCity = await detectVisitorCity(geo);

  const catLabel = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
  const categoryLabels = Object.fromEntries(catLabel);
  const categoryCards = (categories ?? []).slice(0, 10);
  const stats = {
    total: directory.total,
    cities: directory.cities,
    categories: directory.categories,
    updatedThisWeek: directory.updatedThisWeek,
  };

  // Persian city labels with real counts, ranked by listings — replacing a
  // dropdown of raw English `businesses.city` values on an RTL Persian page.
  const cityOptions = geo.cities.slice(0, 40).map(({ config, count }) => ({
    value: config.nameEn,
    label: config.nameFa || config.nameEn,
    count,
  }));
  const cityCards = geo.cities.slice(0, 8);

  // Category × city, with the count the destination page will actually show.
  // Only combos that clear the indexable floor are offered — a quick link to
  // two listings is a worse answer than the category page it came from.
  const comboLinks = geo.cities.slice(0, 4).flatMap(({ config }) =>
    categoryCards.slice(0, 3).map((cat) => ({
      key: `${config.slug}-${cat.slug}`,
      label: `${cat.name} در ${config.nameFa || config.nameEn}`,
      href: `/cities/${config.slug}/${cat.slug}`,
      count: cityCategoryCount(geo, config.slug, cat.slug as string),
    }))
  ).filter((c) => c.count >= 3).sort((a, b) => b.count - a.count).slice(0, 8);

  // Our own listings never take a promotional slot. They stay in search, in
  // their category, in their city and in the sitemap — see
  // lib/data/internal-businesses.ts for why that asymmetry is the honest one.
  const featuredBusinesses = withoutInternal(featuredPool).slice(0, 6);
  const latestBusinesses = withoutInternal(latestPool).slice(0, 6);
  const latestIds = new Set(latestBusinesses.map((b) => b.id as string));
  const popularBusinesses = withoutInternal(popularPool)
    .filter((b) => !latestIds.has(b.id as string) && (b.view_count ?? 0) > 0)
    .slice(0, 6);

  const businessTabs: BusinessTab[] = [];
  if (latestBusinesses.length) {
    businessTabs.push({
      key: "new",
      label: "جدیدترین",
      subtitle: "تازه‌ترین کسب‌وکارهایی که در پلازا منتشر شده‌اند",
      href: "/businesses?sort=new",
      items: latestBusinesses as never,
    });
  }
  if (popularBusinesses.length) {
    businessTabs.push({
      key: "popular",
      label: "پربازدیدترین",
      subtitle: "بیشترین بازدید در پلازا",
      href: "/businesses?sort=views",
      items: popularBusinesses as never,
    });
  }

  const announcements = latestAnnouncements ?? [];
  const showNowBand = featuredBusinesses.length > 0 || announcements.length > 0;

  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="min-h-screen">
        {/* 1. Hero — search-first, suggestions, live numbers */}
        <HomeHero
          stats={stats}
          cities={cityOptions}
          detectedCity={visitorCity?.value ?? null}
          topSearches={popularTerms ? popularTerms.map((t) => t.term) : null}
        />

        {/* 2. Browse by category — the main path for someone without a search
            term ready, so it comes first after the hero. The subtitle used to
            read «دسته‌بندی‌های پرجستجوی پلازا» over rows ordered by
            display_order; nothing here is derived from searches. */}
        <section className="bg-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHead
              title="دنبال چه خدمتی می‌گردی؟"
              subtitle="دسته‌بندی‌های اصلی پلازا"
              center
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {categoryCards.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group relative block h-32 overflow-hidden rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-lg md:h-40"
                >
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
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

        {/* 3. Explore by city. Ranked by real listing counts from the geo index
            — the eight hard-coded cards this replaces left Richmond Hill (763
            listings), North York and Thornhill off a page that had room. */}
        <section className="border-t border-gray-100 bg-white px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHead title="کاوش بر اساس شهر" subtitle="کسب‌وکارهای ایرانی را در شهر خودت پیدا کن" center />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {cityCards.map(({ config, count }) => (
                <Link
                  key={config.slug}
                  href={`/cities/${config.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl"
                >
                  {CITY_ART.has(config.slug) ? (
                    <Image
                      src={`/images/cities/${config.slug}.webp`}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[color:var(--lajvard)]" />
                  )}
                  {/* Two layers, not one. The flat wash keeps mid-tones off the
                      type; the gradient anchors the bottom edge. */}
                  <div className="absolute inset-0 bg-[#14213d]/45" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14213d]/85 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="text-lg font-black drop-shadow-md">{config.nameFa || config.nameEn}</div>
                    <div className="mt-0.5 text-[11px] text-white/75">{faNumber(count)} کسب‌وکار</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Category × city — the shape of the question people actually
                have. Every count is what the destination page will show. */}
            {comboLinks.length ? (
              <div className="mt-8">
                <p className="mb-3 text-center text-xs text-gray-500">یا مستقیم برو سراغ ترکیب دسته و شهر:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {comboLinks.map((c) => (
                    <Link
                      key={c.key}
                      href={c.href}
                      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--annabi)]/40 hover:text-[color:var(--annabi)]"
                    >
                      {c.label}
                      <span className="text-[11px] font-normal text-[color:var(--muted-text)]">{faNumber(c.count)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 text-center">
              <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
                <Link href="/cities">همه‌ی شهرها <ArrowLeft className="mr-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 4. «همین حالا در پلازا» — the paid homepage slot and the newest
            announcements, in one band. They were two sections; on the live
            page one held two cards in a three-column grid and the other held
            exactly one, so both mostly rendered empty columns. Each block now
            picks its layout from its own length, and the band is absent
            entirely when neither has anything. */}
        {showNowBand ? (
          <section className="border-t border-gray-100 bg-gradient-to-b from-amber-50/60 to-white px-4 py-16">
            <div className="mx-auto max-w-7xl">
              {/* The subtitle names only the blocks that are actually below
                  it. A heading promising «جایگاه‌های ویژه» over a band holding
                  nothing but announcements is the same broken promise this
                  version is here to remove. */}
              <SectionHead
                title="همین حالا در پلازا"
                subtitle={
                  featuredBusinesses.length && announcements.length
                    ? "جایگاه‌های ویژه و تازه‌ترین خبرها از کسب‌وکارها"
                    : featuredBusinesses.length
                      ? "کسب‌وکارهایی که جایگاه ویژه را خریده‌اند"
                      : "تخفیف، رویداد و خبر تازه از کسب‌وکارهای پلازا"
                }
              />

              {featuredBusinesses.length ? (
                <>
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                    <Star className="h-3.5 w-3.5" fill="currentColor" /> ویژه
                  </div>
                  <p className="mb-4 text-sm text-gray-500">این‌ها جایگاه ویژه را خریده‌اند — با برچسب، نه پنهانی.</p>
                  <div className={`grid gap-5 ${gridFor(featuredBusinesses.length)}`}>
                    {featuredBusinesses.map((biz: any) => (
                      <BusinessCard key={biz.id} business={biz} categoryLabel={catLabel.get(biz.category)} />
                    ))}
                  </div>
                </>
              ) : null}

              {announcements.length ? (
                <div className={featuredBusinesses.length ? "mt-10" : ""}>
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--gold)]/20 px-3 py-1 text-xs font-black text-[color:var(--text)]">
                    <Megaphone className="h-3.5 w-3.5" /> تازه‌ترین اعلان‌ها
                  </div>
                  <div className={`grid gap-4 ${gridFor(announcements.length)}`}>
                    {announcements.map((a: any) => (
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
              ) : null}
            </div>
          </section>
        ) : null}

        {/* 5. The directory itself — one section, two orderings. Was two
            sections, two headings, two rails of the same object. */}
        {businessTabs.length ? (
          <BusinessTabs tabs={businessTabs} categoryLabels={categoryLabels} />
        ) : null}

        {/* 6. The blog. It used to be reachable from one link inside one
            dropdown, so nothing written there was ever read. Renders nothing
            when no post is published — see components/blog/latest-posts.tsx. */}
        <HomeLatestPosts />

        {/* 7. Channels and groups, in the slot the «چرا پلازا؟» card grid
            held until 26 Aug (Farjad's call). That grid asserted the site was
            trustworthy in four cards; this shows six real channels with the
            date each last posted and the date we checked. One is a claim about
            ourselves and the other is evidence, and the page had room for one.
            Renders nothing while nothing is published, and relabels itself
            when it can only show newly-added entries — see
            components/channels/home-channels.tsx. */}
        <HomeChannels />

        {/* 8. Business owner path */}
        <section className="relative overflow-hidden bg-[color:var(--lajvard)] px-4 py-20 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5" /> برای صاحبان کسب‌وکار
            </div>
            <h2 className="mb-5 text-3xl font-black md:text-4xl">کسب‌وکار ایرانی داری؟ در پلازا معرفی‌اش کن.</h2>
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
                    <span className="text-lg font-black text-[#7A1831]">پلازا</span>
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
                پلازا توی جیبت،
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

/** One heading shape for every section, so nine sections read as one page.
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

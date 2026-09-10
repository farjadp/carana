// ============================================================================
// Source: components/home-hero.tsx
// Version: 3.1.0 — 2026-09-10
// Why: The first screen every visitor sees. Brand-first: annabi → navy wash,
//      the Hidden Č as a faint watermark, a Persepolis merlon parapet, and a
//      search that actually goes somewhere. The numbers are live counts passed
//      from the server — facts, never claims.
//
//      v2 (16 Aug) rebuilt it around one job: find a business. Centred single
//      column, search widest and highest-contrast, stats demoted to one strip,
//      the owner CTA removed as the third copy of itself.
//
//      v3 (9 Sep) fixes what a UX read of the live page found — three things,
//      all of them the same mistake in different clothes: the screen was
//      making claims the data did not support.
//
//        1. THE GOLD NUMBER WAS AN ADMISSION. The strip put «۱۷ مالکیت
//           احرازشده» in gold beside «۹۶۹۳ کسب‌وکار» — every number true, and
//           the first fact a stranger learned was that 0.17 % of the directory
//           is proven. `verified` is a good number where it is a tool: the
//           search page's «فقط احرازشده» filter, which already exists. Its
//           slot here goes to `updatedThisWeek` (211 on the day of the change)
//           — the question a returning visitor actually has, "is this alive".
//           `created_at` was the obvious alternative and is useless: the
//           imports mean every row was created inside the last 30 days.
//
//        2. «پرجستجو:» OVER A HARD-CODED ARRAY. Six chips asserted what people
//           search for; the list was a const in this file. Every search has
//           been logged since 30 Aug, so the question was answerable. It now
//           takes real terms when the server can read them and relabels itself
//           «مثلاً:» when it cannot — the label always describes the list.
//
//        3. ENGLISH CITY NAMES ON AN RTL PERSIAN PAGE. The dropdown listed the
//           raw `businesses.city` values ("Richmond Hill", "North York") while
//           the city cards further down said «ریچموندهیل». Cities now arrive
//           as Persian labels with their listing counts, from the same geo
//           index the city pages use, and the box starts on the visitor's own
//           city when the edge tells us one we have listings for.
//
//      v3.1 (10 Sep) closes a loop that v3 created. The migration was applied
//      and the chips came back «وکیل مهاجرت، املاک، رستوران ایرانی، حسابدار،
//      دندانپزشک، مکانیک» — six terms, every one of which was already a
//      hard-coded chip on this page or on /search. Clicking a chip navigates to
//      /search, and /search logs every query, so the chips had been seeding the
//      log they now read from: «پرجستجو» was measuring our own suggestion, not
//      demand, and would have stayed frozen on those six for ever. Chip clicks
//      now carry ?from=chip and are logged under their own source, so only a
//      typed search counts. Nothing about the label was false — those queries
//      really were run — which is why it took looking at the numbers rather
//      than at the code to see it.
//
//      Search itself moved to components/search/search-box.tsx — one control,
//      with suggestions, shared with the results page.
// Env / Identity: Client component (count-up animation). No data fetching.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Clock3, MapPin, Store } from "lucide-react";

import { brand } from "@goplaza/core";

import { BrandMark } from "@/components/brand-mark";
import { SearchBox, type CityOption } from "@/components/search/search-box";
import { faNumber } from "@goplaza/core";

function useCountUp(target: number, ms = 1400) {
  // Server render shows the real number (no layout jump, correct for crawlers);
  // the client then replays a count-up once. No "started" ref: under React
  // Strict Mode the first mount is thrown away, and a ref guard would leave
  // the second, real mount stuck at 0.
  const [v, setV] = useState(target);
  useEffect(() => {
    if (target <= 0) return;
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    let raf = 0;
    // First frame resets to 0, then eases up — all state writes happen inside
    // rAF callbacks, never synchronously in the effect body.
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/**
 * The fallback chips, used ONLY under the «مثلاً:» label. They are examples of
 * how to phrase a query, which is a true thing to say about them. They are not
 * what anyone searched for, and nothing here may present them as such.
 */
const EXAMPLE_QUERIES = ["وکیل مهاجرت", "دندانپزشک", "رستوران", "حسابدار", "آرایشگاه", "املاک"];

export function HomeHero({
  stats,
  cities,
  detectedCity,
  topSearches,
}: {
  stats: { total: number; cities: number; categories: number; updatedThisWeek: number };
  cities: CityOption[];
  /** The visitor's own city, when the edge named one we have listings for. */
  detectedCity?: string | null;
  /**
   * Genuinely most-searched terms, or null when the aggregate is unavailable.
   * null is not "empty" — it changes the label, because with null we do not
   * know what is popular and must not say we do.
   */
  topSearches?: string[] | null;
}) {
  const router = useRouter();
  const total = useCountUp(stats.total);
  const fresh = useCountUp(stats.updatedThisWeek, 1100);
  const cityN = useCountUp(stats.cities, 900);
  const catN = useCountUp(stats.categories, 700);

  const realTerms = topSearches && topSearches.length >= 3 ? topSearches.slice(0, 6) : null;
  const chips = realTerms ?? EXAMPLE_QUERIES;
  const chipLabel = realTerms ? "پرجستجو:" : "مثلاً:";

  return (
    <section className="relative overflow-hidden bg-[#5A1124]" dir="rtl">
      {/* Wash: annabi → deep navy, warm and calm */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,#7A1831_0%,#5A1124_35%,#14213d_100%)]" />
      {/* Watermark mark, bleeding off the corner */}
      <div className="pointer-events-none absolute -left-24 -top-24 select-none opacity-[0.06]" aria-hidden>
        <BrandMark size={520} color="#f6f1e8" simple />
      </div>
      {/* Faint rings for depth (geometry only, no ornament) */}
      <div className="pointer-events-none absolute bottom-[-40%] right-[-10%] h-[60vw] max-h-[820px] w-[60vw] max-w-[820px] rounded-full border border-white/5" aria-hidden />
      <div className="pointer-events-none absolute bottom-[-34%] right-[-4%] h-[48vw] max-h-[660px] w-[48vw] max-w-[660px] rounded-full border border-white/5" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:px-6 md:pb-20 md:pt-20">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#f6f1e8]/80 backdrop-blur md:text-sm">
          <BrandMark size={14} color="#f6f1e8" simple />
          <span>دایرکتوری فارسی‌زبان کسب‌وکارهای ایرانی در کانادا</span>
        </div>

        <h1 className="text-[2.1rem] font-black leading-[1.25] tracking-tight text-[#f6f1e8] sm:text-5xl md:text-[3.4rem]">
          {brand.tagline.fa}
          <span className="mt-3 block text-xl font-bold leading-snug text-[#f6f1e8]/70 sm:text-2xl md:text-3xl">
            وکیل، پزشک، رستوران، مشاور — همه ایرانی، همه در کانادا، همه یک‌جا.
          </span>
        </h1>

        <div className="mt-9">
          <SearchBox
            cities={cities}
            defaultCity={detectedCity ?? ""}
            cityWasDetected={!!detectedCity}
            tone="light"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[#f6f1e8]/55">{chipLabel}</span>
          {chips.map((s) => (
            <button
              key={s}
              type="button"
              // from=chip so this click is logged as a suggestion followed,
              // never as a search someone thought of. See v3.1 above.
              onClick={() => router.push(`/search?q=${encodeURIComponent(s)}&from=chip`)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[#f6f1e8]/90 transition hover:bg-white/20"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Live counts — one strip, not four cards. Every number is a real
            query result; the line below says so and means it. */}
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4">
          <Stat icon={<Store size={14} />} value={faNumber(total)} label="کسب‌وکار" />
          <Stat icon={<MapPin size={14} />} value={faNumber(cityN)} label="شهر" />
          <Stat icon={<Building2 size={14} />} value={faNumber(catN)} label="دسته‌بندی" />
          <Stat icon={<Clock3 size={14} />} value={faNumber(fresh)} label="به‌روزرسانی این هفته" gold />
        </dl>
        <p className="mt-4 text-[11px] text-[#f6f1e8]/50">
          اعداد زنده از پایگاه‌داده — هر چه می‌بینی همین حالا واقعی است.
        </p>
      </div>

      {/* Merlon parapet — cream, so it hands off to the page ground */}
      <div className="absolute inset-x-0 bottom-0 h-3.5" aria-hidden>
        <svg viewBox="0 0 48 12" preserveAspectRatio="none" className="h-full w-full">
          <pattern id="hero-merlon" width="48" height="12" patternUnits="userSpaceOnUse">
            <path d="M0,12 V8 H6 V4 H12 V0 H24 V4 H30 V8 H36 V12 Z" fill="#f6f1e8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hero-merlon)" />
        </svg>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, gold }: { icon: React.ReactNode; value: string; label: string; gold?: boolean }) {
  return (
    <div>
      <dd className={`text-2xl font-black tabular-nums md:text-3xl ${gold ? "text-[#e6c877]" : "text-[#f6f1e8]"}`}>
        {value}
      </dd>
      <dt className={`mt-1 flex items-center justify-center gap-1.5 text-[11px] ${gold ? "text-[#e6c877]/80" : "text-[#f6f1e8]/60"}`}>
        {icon}
        <span>{label}</span>
      </dt>
    </div>
  );
}

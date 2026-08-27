// ============================================================================
// Source: components/home-hero.tsx
// Version: 2.0.0 — 2026-08-16
// Why: The first screen every visitor sees. Brand-first: annabi → navy wash,
//      the Hidden Č as a faint watermark, a Persepolis merlon parapet, and a
//      search that actually goes somewhere. The numbers are live counts passed
//      from the server — facts, never claims.
//
//      v2 is a redesign around one job: **find a business**. What changed:
//        • Centred, single-column. The old 7/5 split put a 2×2 grid of large
//          stat cards level with the search box, so the page's primary action
//          competed with four numbers nobody came for. Search is now the
//          widest, highest-contrast thing on the screen — the standard shape
//          for a directory (and what the mobile layout already collapsed to).
//        • Stats demoted to one thin strip beneath the search. Same four real
//          counts, ~a quarter of the vertical space, still counting up.
//        • The owner CTA is gone from here. It appeared three times on the
//          old homepage — hero, sticky header, and the dedicated owner
//          section further down. The header carries it on every page; the
//          owner section explains it properly. This one was the redundant
//          copy.
// Env / Identity: Client component (animation + form). No data fetching.
// ============================================================================
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, MapPin, Search, Store } from "lucide-react";

import { brand } from "@goplaza/core";

import { BrandMark } from "@/components/brand-mark";
import { faDigits as fa } from "@goplaza/core";


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

const SUGGESTIONS = ["وکیل مهاجرت", "دندانپزشک", "رستوران", "حسابدار", "آرایشگاه", "املاک"];

export function HomeHero({
  stats,
  cities,
}: {
  stats: { total: number; verified: number; cities: number; categories: number };
  cities: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const total = useCountUp(stats.total);
  const verified = useCountUp(stats.verified, 1100);
  const cityN = useCountUp(stats.cities, 900);
  const catN = useCountUp(stats.categories, 700);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (city) sp.set("city", city);
    router.push(`/search${sp.toString() ? `?${sp}` : ""}`);
  };

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

        <form
          onSubmit={submit}
          className="mx-auto mt-9 flex flex-col gap-2 rounded-2xl bg-white p-2 text-right shadow-[0_24px_60px_rgba(0,0,0,0.35)] md:flex-row"
        >
          <label className="flex flex-1 items-center gap-2 px-3">
            <Search size={18} className="shrink-0 text-[color:var(--annabi)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="دنبال چه کسی می‌گردی؟ مثلاً وکیل مهاجرت"
              className="w-full bg-transparent py-3.5 text-[15px] text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted-text)]"
              aria-label="جستجو"
            />
          </label>
          <label className="flex items-center gap-2 px-3 md:w-52 md:border-r md:border-[color:var(--line)]">
            <MapPin size={18} className="shrink-0 text-[color:var(--lajvard)]" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-transparent py-3.5 text-[15px] text-[color:var(--text)] outline-none"
              aria-label="شهر"
            >
              <option value="">همه‌ی شهرها</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--annabi)] font-bold text-[#f6f1e8] transition hover:bg-[#5A1124] md:px-8"
          >
            جستجو <ArrowLeft size={16} />
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[#f6f1e8]/55">پرجستجو:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[#f6f1e8]/90 transition hover:bg-white/20"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Live counts — one strip, not four cards. Every number is a real
            query result; the line below says so and means it. */}
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4">
          <Stat icon={<Store size={14} />} value={fa(total)} label="کسب‌وکار" />
          <Stat icon={<BadgeCheck size={14} />} value={fa(verified)} label="مالکیت احرازشده" gold />
          <Stat icon={<MapPin size={14} />} value={fa(cityN)} label="شهر" />
          <Stat icon={<Building2 size={14} />} value={fa(catN)} label="دسته‌بندی" />
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

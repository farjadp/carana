// ============================================================================
// Source: components/home-hero.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The first screen every visitor sees. Brand-first: annabi → navy wash,
//      the Hidden Č as a faint watermark, a Persepolis merlon parapet, and a
//      search that actually goes somewhere (/businesses?q=). The numbers are
//      live counts passed from the server and count up on load — they are
//      facts, never claims. Voice per the brand book: calm, credible, warm.
// Env / Identity: Client component (animation + form). No data fetching.
// ============================================================================
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, MapPin, Search, ShieldCheck, Sparkles, Store } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number) => String(n).replace(/\d/g, (d) => FA[Number(d)]);

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
    <section className="relative overflow-hidden bg-[#5c0000]" dir="rtl">
      {/* Wash: annabi → deep navy, warm and calm */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,#800000_0%,#5c0000_35%,#14213d_100%)]" />
      {/* Watermark mark, bleeding off the corner */}
      <div className="absolute -left-24 -top-24 opacity-[0.06] pointer-events-none select-none" aria-hidden>
        <BrandMark size={520} color="#f6f1e8" simple />
      </div>
      {/* Faint lotus-like ring for depth (geometry only, no ornament) */}
      <div className="absolute right-[-10%] bottom-[-40%] w-[60vw] h-[60vw] max-w-[820px] max-h-[820px] rounded-full border border-white/5 pointer-events-none" aria-hidden />
      <div className="absolute right-[-4%] bottom-[-34%] w-[48vw] h-[48vw] max-w-[660px] max-h-[660px] rounded-full border border-white/5 pointer-events-none" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 md:pt-20 pb-20 md:pb-24">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-[#f6f1e8]/80 text-xs md:text-sm mb-6">
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
            <BrandMark size={14} color="#f6f1e8" simple />
            <span>دایرکتوری فارسی‌زبان کسب‌وکارهای ایرانی در کانادا</span>
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-end">
          {/* Copy + search */}
          <div className="lg:col-span-7">
            <h1 className="text-[2.1rem] leading-[1.25] sm:text-5xl md:text-6xl font-black text-[#f6f1e8] tracking-tight">
              با اطمینان پیدا کن.
              <span className="block mt-2 text-[#f6f1e8]/70 font-bold text-2xl sm:text-3xl md:text-4xl leading-snug">
                وکیل، پزشک، رستوران، مشاور — همه ایرانی، همه در کانادا، همه یک‌جا.
              </span>
            </h1>
            <p className="mt-5 text-[#f6f1e8]/75 text-sm md:text-base max-w-xl leading-relaxed">
              چارانا جایی است که هم‌زبان‌های خودت را پیدا می‌کنی؛ با اطلاعات تماس واقعی، نشان احراز مالکیت،
              و تجربه‌ی دیگران — نه تبلیغ.
            </p>

            <form onSubmit={submit} className="mt-8 bg-white rounded-2xl p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)] flex flex-col md:flex-row gap-2">
              <label className="flex-1 flex items-center gap-2 px-3">
                <Search size={18} className="text-[color:var(--annabi)] shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="دنبال چه کسی می‌گردی؟ مثلاً وکیل مهاجرت"
                  className="h-12 w-full bg-transparent outline-none text-[color:var(--text)] placeholder:text-[color:var(--muted-text)] text-[15px]"
                  aria-label="جستجو"
                />
              </label>
              <label className="md:w-56 flex items-center gap-2 px-3 md:border-r md:border-[color:var(--line)]">
                <MapPin size={18} className="text-[color:var(--lajvard)] shrink-0" />
                <select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 w-full bg-transparent outline-none text-[color:var(--text)] text-[15px]" aria-label="شهر">
                  <option value="">همه‌ی شهرها</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <button type="submit" className="h-12 md:px-7 rounded-xl bg-[color:var(--annabi)] hover:bg-[#5c0000] text-[#f6f1e8] font-bold transition flex items-center justify-center gap-2">
                جستجو <ArrowLeft size={16} />
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#f6f1e8]/55">پرجستجو:</span>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => { setQ(s); router.push(`/search?q=${encodeURIComponent(s)}`); }}
                  className="text-[#f6f1e8]/90 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Live numbers */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Store size={18} />} value={fa(total)} label="کسب‌وکار ایرانی" hint="منتشرشده در چارانا" big />
              <Stat icon={<BadgeCheck size={18} />} value={fa(verified)} label="مالکیت احرازشده" hint="با پیامک یا ثبت مستقیم" gold />
              <Stat icon={<MapPin size={18} />} value={fa(cityN)} label="شهر در کانادا" hint="با کسب‌وکار منتشرشده" />
              <Stat icon={<Building2 size={18} />} value={fa(catN)} label="دسته‌بندی" hint="از وکالت تا رستوران" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#f6f1e8]/60">
              <ShieldCheck size={13} /> اعداد زنده از پایگاه‌داده — هر چه می‌بینی همین حالا واقعی است.
            </div>
          </div>
        </div>

        {/* Owner CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
          <Link href="/dashboard/business/new" className="inline-flex items-center gap-2 bg-[#f6f1e8] font-bold px-4 py-2.5 rounded-xl hover:bg-white transition" style={{ color: "#800000" }}>
            <Sparkles size={16} /> کسب‌وکار خودت را رایگان ثبت کن
          </Link>
          <span className="text-[#f6f1e8]/60 text-xs">آدرس سایتت را بده — بقیه را ما پر می‌کنیم.</span>
        </div>
      </div>

      {/* Merlon parapet — cream, so it hands off to the page ground */}
      <div className="absolute inset-x-0 bottom-0 h-3.5" aria-hidden>
        <svg viewBox="0 0 48 12" preserveAspectRatio="none" className="w-full h-full">
          <pattern id="hero-merlon" width="48" height="12" patternUnits="userSpaceOnUse">
            <path d="M0,12 V8 H6 V4 H12 V0 H24 V4 H30 V8 H36 V12 Z" fill="#f6f1e8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hero-merlon)" />
        </svg>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, hint, big, gold }: { icon: React.ReactNode; value: string; label: string; hint: string; big?: boolean; gold?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 backdrop-blur border ${gold ? "bg-[#c9a24b]/10 border-[#c9a24b]/30" : "bg-white/8 border-white/10"}`}>
      <div className={`flex items-center gap-1.5 text-xs ${gold ? "text-[#e6c877]" : "text-[#f6f1e8]/70"}`}>{icon}<span>{label}</span></div>
      <div className={`mt-1 font-black tabular-nums text-[#f6f1e8] ${big ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}>{value}</div>
      <div className="text-[11px] text-[#f6f1e8]/55 mt-0.5">{hint}</div>
    </div>
  );
}

// ============================================================================
// Source: app/story/page.tsx
// Version: 3.0.0 — 2026-08-18 (rebrand: GOPLAZA)
// Why: The brand page: name, the G-mark and what is inside it, the palette
//      (click to copy), type, the imagery motif rules (pre-Islamic Persian,
//      and what is off-limits — unchanged by the rebrand, the photography
//      still follows them), voice, and the vector files. The ZIP kit was
//      removed with the rebrand: no button for a file that does not exist.
// Env / Identity: Static, public.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Download, X } from "lucide-react";
import { brand } from "@goplaza/core";

import { BrandMark } from "@/components/brand-mark";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { MarkSizes, MarkSurfaces, SwatchGrid, type Swatch } from "./brand-kit-client";

export const metadata: Metadata = {
  title: "داستان برند و برندکیت",
  description: "گوپلازا یعنی چه، نشان G چه می‌گوید، و برندکیت کامل: رنگ‌ها، فونت، نقش‌مایه‌ها، قواعد استفاده و فایل‌های لوگو.",
  alternates: { canonical: "/story" },
};

const SWATCHES: Swatch[] = [
  { name: "Burgundy", fa: "زرشکی", hex: "#7A1831", role: "رنگ اصلی — CTA، حالت فعال، نشان", onDark: true },
  { name: "Persian Blue", fa: "لاجورد", hex: "#0047AB", role: "رنگ دوم — لینک‌ها، اکشن‌های ثانویه", onDark: true },
  { name: "Deep Navy", fa: "سرمه‌ای", hex: "#14213D", role: "متن بدنه، سطوح تیره", onDark: true },
  { name: "Warm Cream", fa: "کرم", hex: "#F6F1E8", role: "پس‌زمینه‌ی صفحه؛ متن روی زرشکی" },
  { name: "Gold", fa: "طلایی", hex: "#C9A24B", role: "فقط اکسنت — کنگره، ستاره؛ هرگز سطح" },
];

const DO = ["کنگره‌ی پلکانی هخامنشی (پارَه‌سنگ‌های تخت‌جمشید)", "نیلوفر دوازده‌پر تخت‌جمشید (ساده‌شده)", "بته‌جقه — پیزلیِ فرش ایرانی", "سرو، و هندسه‌ی ستون هخامنشی"];
const DONT = ["طاق تیزه‌دار", "ستاره‌ی هشت‌پر (شمسه)", "گنبد و مناره", "خوشنویسی عربی", "فانوس و هر نقش «شرقیِ» کلی"];

const FILES = [
  { file: "goplaza-symbol.svg", label: "نشان اصلی — زرشکی", note: "SVG وکتور، منبع حقیقت" },
  { file: "goplaza-symbol-black.svg", label: "نشان تک‌رنگ سیاه", note: "چاپ تک‌رنگ، مهر" },
  { file: "goplaza-symbol-white.svg", label: "نشان معکوس سفید", note: "روی زرشکی و سرمه‌ای" },
  { file: "goplaza-logo-horizontal.svg", label: "لاک‌آپ افقی", note: "نشان + واژه‌نشان + شعار، متن قابل ویرایش" },
  { file: "goplaza-app-icon.svg", label: "آیکن اپ", note: "نشان کرم روی زرشکی؛ گوشه‌ها را سیستم گرد می‌کند" },
];

export default function StoryPage() {
  return (
    <PageShell currentPath="/story" currentSection="brand">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "داستان برند", url: "/story" }])} />
      <main className="min-h-screen bg-[color:var(--bg)]">
        {/* ── Hero: the mark, the name, the sound ─────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-28 -top-24 opacity-[0.05]" aria-hidden>
            <BrandMark size={620} color="var(--annabi)" simple />
          </div>
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-12 pt-12 md:grid-cols-[1fr_320px] md:pt-20">
            <div>
              <p className="mb-3 text-xs font-bold tracking-wide text-[color:var(--annabi)]">داستان برند · برندکیت</p>
              <h1 className="text-4xl font-black leading-[1.15] text-[color:var(--text)] md:text-6xl">
                <span dir="ltr" className="font-latin">GOPLAZA</span>
                <span className="block text-2xl font-bold text-[color:var(--muted-text)] md:text-3xl">گوپلازا</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--text)]/85 md:text-lg">
                <em>Go</em> + <em>Plaza</em>: برو به میدان. پلازا همان جایی است که آدم‌ها برای پیدا کردن، دیدن و معامله کردن به آن
                سر می‌زنند — ما همان را برای ایرانیان کانادا ساخته‌ایم: یک مرجع زنده که از آن کسب‌وکارِ همدیگر را پیدا می‌کنند و به آن اعتماد می‌کنند.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-white px-4 py-2 font-bold text-[color:var(--text)] shadow-sm">تلفظ: گو‑پلازا</span>
                <span className="rounded-full bg-white px-4 py-2 font-semibold text-[color:var(--muted-text)] shadow-sm" dir="ltr">/ˌɡoʊˈplɑːzə/</span>
                <span className="rounded-full bg-white px-4 py-2 font-semibold text-[color:var(--muted-text)] shadow-sm" dir="ltr">Discover. Connect. Grow.</span>
              </div>
            </div>
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-[40px] bg-[color:var(--annabi)] shadow-[0_30px_80px_rgba(122,24,49,0.30)] md:h-80 md:w-80">
              <BrandMark size={190} color="#f6f1e8" />
            </div>
          </div>
        </section>

        {/* ── Why the name ────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["گویا", "اسم همان کاری را می‌گوید که محصول می‌کند: برو، پیدا کن، وصل شو. برای فارسی‌زبان آشناست و در بازار کانادا بدون توضیح خوانده می‌شود."],
              ["یک حرف، یک نشان", "حرف G به‌تنهایی مونوگرام است: آیکن اپ، فاوآیکن، مهر تأیید. برند بدون واژه‌نشان هم شناخته می‌شود."],
              ["همیشه یک شکل", "واژه‌نشان همیشه GOPLAZA است — تمام‌بزرگ، یک کلمه. در متن فارسی «گوپلازا» می‌نویسیم؛ هیچ‌کدام ترجمه‌ی دیگری نیست."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
                <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">{t}</h2>
                <p className="text-sm leading-7 text-[color:var(--muted-text)]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The mark ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="mark-h">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr] md:items-start">
            <div className="rounded-[32px] border border-[color:var(--line)] bg-white p-8">
              <BrandMark size={280} color="var(--annabi)" />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">نشان</p>
              <h2 id="mark-h" className="text-3xl font-black text-[color:var(--text)]">نشان G</h2>
              <p className="mt-4 text-base leading-8 text-[color:var(--text)]/85">
                نشان یک <b>G</b> است که سه چیز در آن جمع شده: <b>Go</b> — حرکت؛ <b>مسیر</b> — میله‌ی G که به راست باز می‌شود و سرِ کمان
                که مثل پیکان بریده شده؛ و <b>مکان</b> — پایه‌ای که گوشه‌ی راست‌گوشه می‌سازد، مثل کنج یک میدان. کشف کن، وصل شو، رشد کن.
                هندسه یکی است و تا ۱۶ پیکسل خوانا می‌ماند؛ نسخه‌ی ساده‌شده لازم ندارد.
              </p>
              <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-[color:var(--text)] sm:grid-cols-2">
                {["فاصله‌ی امن: به اندازه‌ی ضخامت کمان از هر طرف", "حداقل اندازه: ۱۶px دیجیتال، ۶mm چاپ", "همیشه تک‌رنگ؛ هرگز گرادیان یا سایه", "هرگز کج، کشیده یا با کادر اضافی"].map((r) => (
                  <li key={r} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2"><Check size={16} className="mt-0.5 flex-none text-[color:var(--lajvard)]" />{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6"><MarkSurfaces /></div>
          <div className="mt-4"><MarkSizes /></div>
        </section>

        {/* ── Colour ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="color-h">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">رنگ</p>
          <h2 id="color-h" className="text-3xl font-black text-[color:var(--text)]">پنج رنگ، یک قاعده</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)]">
            زرشکی و لاجوردِ کاشی روی کرمِ کاغذ. سرمه‌ای برای متن. طلایی فقط اکسنت است — کنگره، خطِ زیر شعار — و هرگز پس‌زمینه یا دکمه نمی‌شود. روی هر رنگ بزن تا هگزش کپی شود.
          </p>
          <div className="mt-6"><SwatchGrid swatches={SWATCHES} /></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-[color:var(--annabi)] p-5 text-[#f6f1e8]"><strong>متن روی زرشکی کرم است، نه سفید.</strong><p className="mt-1 text-sm text-[#f6f1e8]/80">سفید خالص روی زرشکی زننده می‌شود؛ کرم گرم می‌ماند.</p></div>
            <div className="rounded-2xl bg-white p-5 text-[color:var(--text)] border border-[color:var(--line)]"><strong>یک دکمه‌ی پُر در هر نما.</strong><p className="mt-1 text-sm text-[color:var(--muted-text)]">زرشکی برای اکشن اصلی؛ لاجورد خطی برای دومی؛ بقیه رنگ‌مایه‌ای (tint).</p></div>
          </div>
        </section>

        {/* ── Type ────────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="type-h">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">فونت</p>
          <h2 id="type-h" className="text-3xl font-black text-[color:var(--text)]">وزیرمتن برای فارسی، Manrope برای لاتین</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
              <p className="text-xs font-bold text-[color:var(--muted-text)]">Vazirmatn · ۴۰۰ تا ۸۰۰</p>
              <p className="mt-3 text-4xl font-black leading-tight text-[color:var(--text)]">{brand.tagline.fa}</p>
              <p className="mt-2 text-base leading-8 text-[color:var(--text)]/85">کسب‌وکارهای ایرانی کانادا، یک‌جا و با اطمینان. ۰۱۲۳۴۵۶۷۸۹</p>
              <p className="mt-3 text-xs leading-6 text-[color:var(--muted-text)]">هر وزن یک خانواده‌ی جداست (وزن‌های استاتیک) — در موبایل با fontFamily انتخاب می‌شود نه fontWeight.</p>
            </div>
            <div className="rounded-3xl border border-[color:var(--line)] bg-white p-6" dir="ltr">
              <p className="text-xs font-bold text-[color:var(--muted-text)]">Manrope · Latin UI</p>
              <p className="mt-3 font-latin text-4xl font-extrabold leading-tight text-[color:var(--text)]">GOPLAZA</p>
              <p className="mt-2 font-latin text-base leading-8 text-[color:var(--text)]/85">{brand.tagline.en} Toronto · Vancouver · Montréal — 0123456789</p>
              <p className="mt-3 font-latin text-xs leading-6 text-[color:var(--muted-text)]">The wordmark is GOPLAZA in heavy geometric caps, GO in burgundy and PLAZA in navy. Numbers in Persian copy stay Persian.</p>
            </div>
          </div>
        </section>

        {/* ── Motifs ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="motif-h">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">نقش‌مایه</p>
          <h2 id="motif-h" className="text-3xl font-black text-[color:var(--text)]">ایرانیِ پیش از اسلام — عمداً</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)]">
            این تمایز مهم است و یک بار اشتباه شد: اولین نسخه‌ی تصاویر دسته‌ها طاق تیزه‌دار و ستاره‌ی هشت‌پر داشت و «اسلامی» خوانده شد، نه «ایرانی». رد و از نو کشیده شد.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 font-black text-[#0f7b4f]"><Check size={18} /> بله</h3>
              <ul className="space-y-2 text-sm text-[color:var(--text)]">{DO.map((d) => <li key={d} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#0f7b4f]" />{d}</li>)}</ul>
            </div>
            <div className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 font-black text-[color:var(--annabi)]"><X size={18} /> هرگز</h3>
              <ul className="space-y-2 text-sm text-[color:var(--text)]">{DONT.map((d) => <li key={d} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--annabi)]" />{d}</li>)}</ul>
            </div>
          </div>
          {/* The merlon, live */}
          <div className="mt-6 rounded-3xl bg-[color:var(--text)] p-6 text-[#f6f1e8]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <strong className="block">کنگره‌ی پلکانی</strong>
                <span className="text-sm text-[#f6f1e8]/70">تنها تزئین مجاز؛ به‌عنوان خط جداکننده، پایه‌ی هیرو، یا نشانگر بخش. طلایی یا کرم، هرگز به‌عنوان قاب دورِ همه‌چیز.</span>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => <span key={i} className="block h-3 w-4 rounded-t-sm bg-[color:var(--gold)]" />)}
              </div>
            </div>
          </div>
        </section>

        {/* ── Voice ───────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-10" aria-labelledby="voice-h">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">لحن</p>
          <h2 id="voice-h" className="text-3xl font-black text-[color:var(--text)]">صریح، گرم، بی‌ادعا</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["دوم‌شخصِ خودمانی", "«پیدا کن»، «بگو»، «ثبتش کن». نه «کاربر گرامی»، نه «لطفاً توجه فرمایید»."],
              ["عدد را می‌گوییم، ادعا نمی‌کنیم", "«۶۸۰ کسب‌وکار، ۳ تأییدشده» — هر عددی که روی صفحه است از پایگاه داده می‌آید. «بهترین» و «کامل‌ترین» نداریم."],
              ["فارسیِ روان با فاصله‌ی درست", "نیم‌فاصله همیشه؛ اعداد فارسی در متن فارسی؛ اسم‌های انگلیسیِ شهر و برند لاتین می‌مانند."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
                <h3 className="mb-2 font-black text-[color:var(--text)]">{t}</h3>
                <p className="text-sm leading-7 text-[color:var(--muted-text)]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Files ───────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-10" aria-labelledby="files-h">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_24px_60px_rgba(20,33,61,0.08)] md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">دانلود</p>
                <h2 id="files-h" className="text-3xl font-black text-[color:var(--text)]">برندکیت</h2>
                <p className="mt-2 max-w-xl text-sm leading-7 text-[color:var(--muted-text)]">SVG منبعِ حقیقت است؛ در Figma، Illustrator، Sketch و Affinity تمیز باز می‌شود. قبل از چاپ، واژه‌نشان را به outline تبدیل کنید.</p>
              </div>
            </div>
            <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FILES.map((f) => (
                <li key={f.file}>
                  <a href={`/brand/${f.file}`} download className="group flex items-center gap-4 rounded-2xl border border-[color:var(--line)] p-4 transition hover:border-[color:var(--lajvard)]/40 hover:bg-[color:var(--bg)]">
                    <span className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/brand/${f.file}`} alt="" className="h-9 w-9 object-contain" />
                    </span>
                    <span className="flex-1">
                      <strong className="block text-sm text-[color:var(--text)]">{f.label}</strong>
                      <span className="block text-xs text-[color:var(--muted-text)]">{f.note}</span>
                      <span className="mt-1 block text-[11px] text-[color:var(--muted-text)]" dir="ltr">{f.file}</span>
                    </span>
                    <Download size={16} className="text-[color:var(--muted-text)] transition group-hover:text-[color:var(--lajvard)]" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-[color:var(--muted-text)]">
              مالکیت: Ashavid Inc. استفاده برای معرفی گوپلازا (رسانه، شریک، لینک) آزاد است؛ تغییر شکل، رنگ یا ترکیب با نشان دیگر نه. سؤال؟ <Link href="/contact" className="font-bold text-[color:var(--lajvard)]">تماس</Link>
              {" "}· <Link href="/team" className="inline-flex items-center gap-1 font-bold text-[color:var(--lajvard)]">تیم <ArrowLeft size={12} /></Link>
            </p>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

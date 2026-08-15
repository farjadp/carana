// ============================================================================
// Source: app/about/page.tsx
// Version: 2.0.0 — 2026-08-15
// Why: The real "about" page. Replaces the placeholder that literally said
//      "this section is waiting for your data" with the actual story: why
//      čārana exists, who builds it (Ashavid Inc., founded by Farjad
//      Pourmohammad), the four brand principles from the brand book, how the
//      product works, and the numbers — live from the database, never claims.
// Env / Identity: Server component; public reads only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Compass, Heart, Leaf, MapPin, ShieldCheck, Sparkles, Store } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { BrandMark } from "@/components/brand-mark";
import { company } from "@/lib/data/company";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "درباره ما",
  description: `چارانا دایرکتوری فارسی‌زبان کسب‌وکارهای ایرانی در کاناداست — ساخته‌ی ${company.legalName} در تورنتو. با اطمینان پیدا کن.`,
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number) => String(n).replace(/\d/g, (d) => FA[Number(d)]);

const PRINCIPLES = [
  { icon: ShieldCheck, title: "اعتماد", body: "هر ادعایی روی صفحه باید پشتش واقعیت باشد. نشان «مالکیت احرازشده» فقط وقتی می‌آید که صاحب کسب‌وکار با پیامک به شماره‌ی خودش یا با ثبت مستقیم آن را ثابت کرده باشد — و هر شش ماه باید تمدید شود." },
  { icon: Compass, title: "کشف", body: "کوتاه‌ترین مسیر از «دنبال چه می‌گردم» تا «با کی تماس بگیرم». به زبان خودت، در شهر خودت، بدون این‌که بین تبلیغ و واقعیت گم شوی." },
  { icon: Heart, title: "جامعه", body: "برای ایرانیانِ کانادا ساخته شده — نه ترجمه‌ای از یک دایرکتوری عمومی. تجربه‌ی هم‌زبان‌ها، یادداشت خصوصی خودت، و کسب‌وکارهایی که واقعاً می‌شناسی." },
  { icon: Leaf, title: "کانادا", body: "اینجا خانه است. محلی، مرتبط، به‌روز — با استان و شهر واقعی، شماره‌ی کانادایی، ساعات کاری کانادایی." },
];

const HOW = [
  { n: "۱", title: "جستجو یا گشتن", body: "بر اساس دسته، شهر یا استان — یا مستقیم نام کسب‌وکار و خدمت." },
  { n: "۲", title: "پروفایل کامل", body: "تلفن، واتساپ، آدرس، ساعات کاری، خدمات و تعرفه، شبکه‌های اجتماعی و لینک رزرو — همه یک‌جا." },
  { n: "۳", title: "نشان اعتماد", body: "ببین چه کسی مالکیتش را ثابت کرده. بقیه را با یک کلیک ذخیره کن یا برای خودت یادداشت بگذار." },
  { n: "۴", title: "تماس مستقیم", body: "زنگ بزن، پیام بده، مسیر بگیر یا نوبت رزرو کن — چارانا واسطه‌ی هیچ معامله‌ای نیست." },
];

export default async function AboutPage() {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const [{ count: total }, { count: verified }, { data: cityRows }, { count: categories }] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", ["APPROVED", "PUBLISHED"]),
    supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", ["APPROVED", "PUBLISHED"]).gt("verified_until", nowIso),
    supabase.from("businesses").select("city").in("status", ["APPROVED", "PUBLISHED"]).not("city", "is", null),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  const cities = new Set((cityRows ?? []).map((r) => String(r.city).trim().toLowerCase()).filter(Boolean)).size;

  return (
    <InnerPage
      currentPath="/about"
      currentSection="brand"
      eyebrow="درباره ما"
      title="چارانا برای این ساخته شد که با اطمینان پیدا کنی."
      description="یک دایرکتوری فارسی‌زبان برای کسب‌وکارهای ایرانی در کانادا — با اطلاعات واقعی، نشان احراز مالکیت و تجربه‌ی هم‌زبان‌ها. نه تبلیغ، نه لیست خالی."
    >
      {/* Numbers */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" dir="rtl">
        {[
          { icon: Store, v: fa(total ?? 0), l: "کسب‌وکار منتشرشده" },
          { icon: BadgeCheck, v: fa(verified ?? 0), l: "مالکیت احرازشده", gold: true },
          { icon: MapPin, v: fa(cities), l: "شهر در کانادا" },
          { icon: Sparkles, v: fa(categories ?? 0), l: "دسته‌بندی" },
        ].map(({ icon: Icon, v, l, gold }) => (
          <div key={l} className={`rounded-2xl p-4 border ${gold ? "bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30" : "bg-white border-[color:var(--line)]"}`}>
            <div className="flex items-center gap-1.5 text-xs text-[color:var(--muted-text)]"><Icon size={14} className={gold ? "text-[color:var(--gold)]" : "text-[color:var(--annabi)]"} />{l}</div>
            <div className="mt-1 text-3xl font-black text-[color:var(--text)] tabular-nums">{v}</div>
          </div>
        ))}
        <p className="col-span-2 md:col-span-4 text-[11px] text-[color:var(--muted-text)]">اعداد زنده از پایگاه‌داده — نه تخمین، نه هدف.</p>
      </section>

      {/* Why */}
      <section className="mt-12 grid lg:grid-cols-12 gap-8 items-start" dir="rtl">
        <div className="lg:col-span-7 space-y-4 text-[15px] leading-[1.95] text-[color:var(--text)]/85">
          <h2 className="text-2xl font-black text-[color:var(--text)] flex items-center gap-2"><Merlon /> چرا چارانا؟</h2>
          <p>
            وقتی تازه به کانادا می‌رسی، اولین سؤال‌ها ساده‌اند و جوابشان سخت: کدام وکیل مهاجرت فارسی حرف می‌زند؟
            دندانپزشکی که خانواده‌ام راحت باشد کجاست؟ حسابداری که مالیات کانادا و شرایط تازه‌وارد را با هم بفهمد؟
            جواب‌ها پراکنده بودند — در گروه‌های تلگرام، پست‌های قدیمی اینستاگرام، توصیه‌ی دهان‌به‌دهان. و بین
            «کسی که واقعاً کارش را بلد است» و «کسی که فقط تبلیغ می‌کند» فرق گذاشتن، تجربه می‌خواست که تازه‌وارد ندارد.
          </p>
          <p>
            چارانا آن مرجع متمرکز است: کسب‌وکارهای ایرانی کانادا، به فارسی، با اطلاعات کامل — و یک تفاوت مهم:
            <strong className="text-[color:var(--annabi)]"> نشان احراز مالکیت.</strong> وقتی صاحب کسب‌وکار با شماره‌ی خودش ثابت
            کرده که این پروفایل مال اوست، تو می‌دانی با چه کسی طرفی. و چون این نشان هر شش ماه باید تمدید شود،
            «تاییدشده» یعنی همین امروز، نه سه سال پیش.
          </p>
          <p>
            اسم را از ریشه‌های ایرانی باستان گرفتیم — <span dir="ltr" className="font-bold">čārana</span>، چیزی نزدیک به «جای گردش و
            دادوستد» — و هویت بصری را از تخت‌جمشید: کنگره‌های پلکانی، نه هیچ کلیشه‌ی «شرقی». چون می‌خواستیم
            ایرانی باشد، نه نوستالژیک. <Link href="/story" className="text-[color:var(--lajvard)] font-bold">داستان اسم →</Link>
          </p>
        </div>

        {/* Builder card */}
        <aside className="lg:col-span-5">
          <div className="rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10" aria-hidden><BrandMark size={220} color="#f6f1e8" simple /></div>
            <div className="relative">
              <div className="text-xs text-[#f6f1e8]/60 mb-2">سازنده</div>
              <div className="text-xl font-black">{company.legalName}</div>
              <div className="text-sm text-[#f6f1e8]/75 mt-1">شرکت اجرایی و تحول دیجیتال · تورنتو</div>
              <p className="text-sm text-[#f6f1e8]/80 leading-relaxed mt-4">
                آشاوید برای کسب‌وکارها سیستم‌های عملیاتی و اتوماسیون هوش مصنوعی می‌سازد و به بنیان‌گذاران مهاجر کمک
                می‌کند شرکت واقعی در کانادا راه بیندازند. چارانا محصولی است که برای همین جامعه ساخته و منتشر می‌کند.
              </p>
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="text-xs text-[#f6f1e8]/60 mb-1">بنیان‌گذار</div>
                <div className="font-bold">فرجاد پورمحمد</div>
                <div className="text-xs text-[#f6f1e8]/70 mt-0.5">مشاور استراتژیک و مهندس سیستم · ۱۷ سال در فناوری · بیش از ۲۵ استارتاپ منتورشده · سرممیز ISO 27001</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <a href={company.parentSite} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">ashavid.ca</a>
                <a href="https://www.farjadp.com" target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">farjadp.com</a>
                <a href={company.social.linkedin} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">لینکدین</a>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Principles */}
      <section className="mt-14" dir="rtl">
        <h2 className="text-2xl font-black text-[color:var(--text)] flex items-center gap-2 mb-6"><Merlon /> چهار اصل، به همین ترتیب</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl bg-white border border-[color:var(--line)] p-5 flex gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)] flex items-center justify-center shrink-0"><Icon size={20} /></div>
              <div>
                <div className="font-black text-[color:var(--text)]"><span className="text-[color:var(--gold)] ml-1">{fa(i + 1)}.</span> {title}</div>
                <p className="text-sm text-[color:var(--text)]/80 leading-relaxed mt-1">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-14" dir="rtl">
        <h2 className="text-2xl font-black text-[color:var(--text)] flex items-center gap-2 mb-6"><Merlon /> چطور کار می‌کند</h2>
        <ol className="grid md:grid-cols-4 gap-4">
          {HOW.map((s) => (
            <li key={s.n} className="rounded-2xl bg-[color:var(--bg)] border border-[color:var(--line)] p-5">
              <div className="w-9 h-9 rounded-xl bg-[color:var(--annabi)] text-[#f6f1e8] font-black flex items-center justify-center mb-3">{s.n}</div>
              <div className="font-bold text-[color:var(--text)]">{s.title}</div>
              <p className="text-sm text-[color:var(--muted-text)] leading-relaxed mt-1">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Owners */}
      <section className="mt-14 rounded-3xl bg-[color:var(--annabi)] text-[#f6f1e8] p-7 md:p-9 relative overflow-hidden" dir="rtl">
        <div className="absolute -left-16 -top-16 opacity-[0.07]" aria-hidden><BrandMark size={300} color="#f6f1e8" simple /></div>
        <div className="relative grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8">
            <h2 className="text-2xl md:text-3xl font-black">صاحب کسب‌وکار هستی؟</h2>
            <p className="text-[#f6f1e8]/80 mt-2 leading-relaxed">
              ثبت رایگان است. آدرس سایتت را بده — نام، خدمات، ساعات و راه‌های تماس را خودمان از آن می‌خوانیم؛ تو فقط
              مرور و تایید می‌کنی. بعد با یک پیامک مالکیتت را ثابت کن و نشان تایید بگیر.
            </p>
          </div>
          <div className="md:col-span-4 flex md:justify-end">
            <Link href="/dashboard/business/new" className="inline-flex items-center gap-2 bg-[#f6f1e8] font-bold px-5 py-3 rounded-xl hover:bg-white transition" style={{ color: "#800000" }}>
              شروع ثبت <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </section>

      <p className="mt-10 text-xs text-[color:var(--muted-text)] leading-relaxed" dir="rtl">
        {company.brandFa} محصولی از {company.legalName} است، ثبت‌شده در {company.jurisdiction}. برای همکاری، رسانه یا
        پیشنهاد: <a href={`mailto:${company.email.partners}`} className="text-[color:var(--lajvard)] font-bold" dir="ltr">{company.email.partners}</a>
      </p>
    </InnerPage>
  );
}

function Merlon() {
  return (
    <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg>
  );
}

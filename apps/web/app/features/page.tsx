// ============================================================================
// Source: app/features/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: One page that answers "what do I actually get?" — for a visitor and
//      for a business owner, separately, because they want different
//      answers and were previously being handed the same marketing copy.
//
//      This page is nothing but claims, which makes it the easiest place in
//      the product to break the honesty rule. Two defences are built in:
//
//      1. **Plan quantities are read from lib/billing/plans.ts**, never
//         retyped. If GALLERY_LIMITS changes, this page changes with it —
//         it cannot drift into promising 10 photos while the server clamps
//         at 5.
//      2. **A "not built yet" section exists and is honest.** Everything
//         audited as absent on 16 Aug (in-app booking, embedded map, store
//         listings, per-business AI articles, multi-branch UI, QR tracking)
//         is listed as coming, not quietly omitted so the page reads
//         better. Omitting them is what would make the rest untrustworthy.
//
//      Deliberately NOT duplicating: /pricing owns prices and checkout,
//      /how-it-works owns the four-step journey, /trust owns the
//      verification argument. This page links to them rather than
//      restating them — the home page just had three duplications removed
//      for exactly this reason.
// Env / Identity: Public, static. No data fetching — every line here is a
//      product fact, not a live count.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase,
  ArrowLeft, BadgeCheck, Bell, Bookmark, Building2, CalendarClock, Clock,
  Flame, Image as ImageIcon, Link2, Megaphone, MessageSquare, Mic, NotebookPen,
  Search, Sparkles, Star, TrendingUp,
  UserRound,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { BrandMark } from "@/components/brand-mark";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/seo/local";
import { ANNOUNCEMENT_LIMITS, GALLERY_LIMITS, PLANS } from "@/lib/billing/plans";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = {
  title: "امکانات پلازا",
  description:
    "دقیقاً چه چیزی می‌گیری — برای کسی که دنبال کسب‌وکار می‌گردد، و برای صاحب کسب‌وکار. رایگان، استارتر و پریمیوم، بدون ادعای اضافه.",
  alternates: { canonical: "/features" },
};

/** `null` in the limits table means unlimited. */
const qty = (n: number | null) => (n === null ? "نامحدود" : fa(n));

type Item = { icon: React.ReactNode; title: string; body: string };

const VISITOR_FREE: Item[] = [
  {
    icon: <Search size={18} />,
    title: "جستجوی فارسی که اشتباه تایپ را می‌بخشد",
    body: "اگر کیبورد روی فارسی مانده باشد و به‌جای dental بنویسی «یثدفشم»، باز هم پیدایش می‌کند. شهر و دسته هم فیلتر می‌شوند، و اگر در شهرت چیزی نبود خودش دایره را بازتر می‌کند و می‌گوید که این کار را کرده.",
  },
  {
    icon: <Building2 size={18} />,
    title: "پروفایل کامل هر کسب‌وکار",
    body: "شماره، واتساپ، ایمیل، سایت، آدرس، ساعت کاری، خدمات و تعرفه‌ها، و شماره‌ی مرجع برای وقتی با پشتیبانی تماس می‌گیری.",
  },
  {
    icon: <Clock size={18} />,
    title: "«الان باز است» که واقعاً محاسبه می‌شود",
    body: "از ساعت کاری اعلام‌شده و ساعت همین لحظه‌ی دستگاه خودت — نه برچسبی که کسی دستی گذاشته باشد.",
  },
  {
    icon: <BadgeCheck size={18} />,
    title: "نشان احراز مالکیت",
    body: "یعنی صاحب کسب‌وکار شماره یا ایمیلش را با کد اثبات کرده. شش ماه اعتبار دارد و با تغییر شماره خودبه‌خود برداشته می‌شود. فروشی نیست — در گران‌ترین پلن هم نمی‌شود خریدش.",
  },
  {
    icon: <Megaphone size={18} />,
    title: "اعلان‌های تازه",
    body: "تخفیف، رویداد و خبر کسب‌وکارها؛ هم روی صفحه‌ی اول، هم روی پروفایل خودشان.",
  },
  {
    icon: <Briefcase size={18} />,
    title: "تابلوی فرصت‌های شغلی",
    body: "آگهی استخدام کسب‌وکارهای ایرانی، با فیلتر شهر، نوع همکاری و اینکه کدام زبان لازم است. هر آگهی تاریخ انقضا دارد و بعد از آن خودبه‌خود برداشته می‌شود، پس چیزی که می‌بینی هنوز باز است. درخواست مستقیم به خود کسب‌وکار می‌رود؛ پلازا رزومه‌ای دریافت نمی‌کند.",
  },
  {
    icon: <Mic size={18} />,
    title: "اگر چیزی نبود، بگو — با تایپ یا صدا",
    body: "بدون ساختن حساب. همین درخواست‌ها تعیین می‌کنند بعد سراغ چه کسب‌وکاری برویم.",
  },
];

const VISITOR_ACCOUNT: Item[] = [
  {
    icon: <Bookmark size={18} />,
    title: "ذخیره و لیست «می‌خواهم بروم»",
    body: "کسب‌وکارها را نشان کن و بعداً از دفترچه‌ی خودت پیدایشان کن.",
  },
  {
    icon: <NotebookPen size={18} />,
    title: "یادداشت خصوصی",
    body: "فقط خودت می‌بینی. نه صاحب کسب‌وکار، نه بقیه‌ی کاربران.",
  },
  {
    icon: <Star size={18} />,
    title: "ثبت نظر عمومی",
    body: "بعد از بررسی مدیر منتشر می‌شود. صاحب کسب‌وکار می‌تواند زیرش پاسخ عمومی بگذارد.",
  },
  {
    icon: <Bell size={18} />,
    title: "«باخبرم کن» برای هر کسب‌وکار",
    body: "وقتی اعلان تازه‌ای بگذارد، ایمیل می‌گیری و در پنل خودت هم جمع می‌شود. ذخیره‌کردن به‌تنهایی این کار را نمی‌کند — باید صریح روشنش کنی.",
  },
];

/** Read from the same table the server clamps against. */
const G = GALLERY_LIMITS;
const A = ANNOUNCEMENT_LIMITS;

const OWNER_FREE: Item[] = [
  {
    icon: <Building2 size={18} />,
    title: "پروفایل کامل، رایگان و همیشگی",
    body: "همه‌ی اطلاعات تماس، ساعت کاری، خدمات و تعرفه‌ها. حضور در جستجو، دسته‌بندی و صفحه‌ی شهر.",
  },
  {
    icon: <BadgeCheck size={18} />,
    title: "نشان احراز مالکیت — رایگان",
    body: "با اثبات شماره یا ایمیل. هرگز فروخته نمی‌شود؛ اگر اعتماد را می‌فروختیم دیگر معنایی نداشت.",
  },
  {
    icon: <ImageIcon size={18} />,
    title: `${qty(G.free.photos)} عکس گالری`,
    body: "به‌علاوه‌ی لوگو و تصویر کاور.",
  },
  {
    icon: <Megaphone size={18} />,
    title: `${qty(A.free)} اعلان در ماه`,
    body: "تخفیف، رویداد یا خبر تازه، روی پروفایل و صفحه‌ی اول.",
  },
  {
    icon: <TrendingUp size={18} />,
    title: "آمار پایه (۳۰ روز)",
    body: "بازدید و مجموع اقدام‌ها.",
  },
  {
    icon: <CalendarClock size={18} />,
    title: "لینک رزرو نوبت",
    body: "لینک تقویم بیرونی خودت روی پروفایل. فعلاً برای همه‌ی پلن‌ها رایگان است.",
  },
];


/** Jobs are free and unlimited by decision (18 Aug). Nothing about them may
 *  appear in the Starter or Premium lists, or in the pricing table — the
 *  moment it does, the page is claiming a perk that does not exist. */
const OWNER_JOBS: Item = {
  icon: <Briefcase size={18} />,
  title: "آگهی استخدام — رایگان و بدون سقف",
  body: "در هر پلنی، از جمله رایگان. تنها محدودیت این است که هر کسب‌وکار در ۲۴ ساعت تا ۵ آگهی ثبت کند، و این یک محدودیت فنی برای جلوگیری از سوءاستفاده است، نه چیزی که با ارتقای پلن برداشته شود. اگر کسب‌وکارت تاییدشده باشد، آگهی بدون بررسی منتشر می‌شود؛ وگرنه اول بررسی می‌شود. یک ویرایشگر ساده هم هست که با کمک هوش مصنوعی پیش‌نویس متن را می‌نویسد — از روی همان چیزی که خودت وارد کرده‌ای، نه از چیزی که نگفته‌ای.",
};

const OWNER_STARTER: Item[] = [
  {
    icon: <TrendingUp size={18} />,
    title: "آمار کامل (۹۰ روز)",
    body: "تفکیک هر اقدام و مبدأ بازدید.",
  },
  {
    icon: <ImageIcon size={18} />,
    title: `${qty(G.pro.photos)} عکس + ${G.pro.video ? "۱ ویدئو" : "بدون ویدئو"}`,
    body: "گالری کامل روی پروفایل.",
  },
  {
    icon: <Megaphone size={18} />,
    title: `${qty(A.pro)} اعلان در ماه`,
    body: "در بازه‌ی ۳۰ روز گردشی، نه ماه تقویمی.",
  },
  {
    icon: <MessageSquare size={18} />,
    title: "پاسخ عمومی به نظرات",
    body: "زیر هر نظر منتشرشده، با نام کسب‌وکار خودت.",
  },
  {
    icon: <Flame size={18} />,
    title: "وضعیت زنده «الان شلوغیم / خلوته»",
    body: "روی کارت‌ها و پروفایل. بعد از چهار ساعت خودبه‌خود برداشته می‌شود تا هیچ‌وقت وضعیت کهنه نماند.",
  },
];

const OWNER_PREMIUM: Item[] = [
  {
    icon: <Sparkles size={18} />,
    title: `گالری و اعلان ${qty(A.featured)}`,
    body: `${qty(G.featured.photos)} عکس، و اعلان بدون سقف ماهانه.`,
  },
  {
    icon: <Link2 size={18} />,
    title: "صفحه‌ی لینک با آدرس دلخواه",
    body: "مثل gplz.link/dr-ahmadi — یک صفحه با همه‌ی راه‌های تماس، برای بیوی اینستاگرام و کارت ویزیت.",
  },
  {
    icon: <Star size={18} />,
    title: "جایگاه ویژه، با برچسب",
    body: "بالای فهرست شهر و دسته‌ی خودت و در جستجو — همیشه با نشان «ویژه». رتبه‌بندی پنهانی به نفع پرداخت‌کننده انجام نمی‌دهیم.",
  },
  {
    icon: <Sparkles size={18} />,
    title: "بخش ویژه‌ی صفحه‌ی اول",
    body: "در بالای صفحه‌ی نخست پلازا.",
  },
  {
    icon: <UserRound size={18} />,
    title: "اختیار نمایش نام صاحب کسب‌وکار",
    body: "روی آگهی تاییدشده، نام صاحب کسب‌وکار به‌صورت پیش‌فرض دیده می‌شود — در همه‌ی پلن‌ها. فقط در پریمیوم می‌توانی خاموشش کنی. اگر اشتراکت تمام شود، پنهان می‌ماند؛ نامی که عمداً پنهان شده با پایان یک اشتراک دوباره منتشر نمی‌شود.",
  },
];

/** Audited absent on 18 Aug 2026. Listed because omitting them is what
 *  would make everything above it untrustworthy. */
const COMING = [
  "رزرو نوبت واقعی داخل پلازا (الان فقط لینک به تقویم بیرونی است)",
  "نقشه‌ی جاسازی‌شده روی پروفایل",
  "اپ روی App Store و Google Play (فعلاً فقط دانلود مستقیم اندروید)",
  "اعلان از راه پیامک و پوش نوتیفیکیشن (فعلاً ایمیل و داخل پنل)",
  "مقاله‌ی وبلاگ اختصاصی برای کسب‌وکارهای پریمیوم",
  "نمایش چندشعبه‌ای روی نقشه",
  "لینک QR با ردیابی مبدأ در آمار",
  "ثبت آگهی استخدام از داخل اپ موبایل (فعلاً فقط خواندنی است و ثبت از وب‌سایت انجام می‌شود)",
  "ایمیل اطلاع‌رسانی نتیجه‌ی بررسی آگهی استخدام و یادآور نزدیک‌شدن به انقضا",
  "دریافت رزومه داخل پلازا (درخواست‌ها مستقیم به ایمیل، تلفن یا فرم خود کسب‌وکار می‌رود)",
];

export default function FeaturesPage() {
  return (
    <PageShell currentPath="/features" currentSection="business">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "امکانات", url: "/features" }])} />
      {/* `section { margin-bottom: 72px }` is a global rule in globals.css.
          It is right for pages built out of separate slabs and wrong here:
          it opened a 72px cream gap under every band, so each `border-t`
          drew a line that touched nothing and the page read as ten
          disconnected panels. Neutralised for this page only; the rhythm
          below is the section padding.

          The `!` is not laziness: that rule is unlayered, and unlayered CSS
          outranks every Tailwind utility no matter how specific, because
          utilities live in @layer utilities. globals.css documents the same
          trap for `a { color }` at the top of the file. */}
      <main className="bg-[color:var(--bg)] [&>section]:mb-0!" dir="rtl">
        {/* ── Hero ────────────────────────────────────────────────────
            The page's own wash, in the same language as the home hero:
            annabi → navy, the mark bleeding off the corner, two rings for
            depth. It used to open on a plain cream box, which made the
            longest page on the site look like its least considered. */}
        <section className="relative overflow-hidden bg-[#5A1124]">
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,#7A1831_0%,#5A1124_38%,#14213d_100%)]" />
          <div className="pointer-events-none absolute -left-28 -top-28 select-none opacity-[0.06]" aria-hidden>
            <BrandMark size={480} color="#f6f1e8" simple />
          </div>
          <div className="pointer-events-none absolute bottom-[-46%] right-[-8%] h-[52vw] max-h-[720px] w-[52vw] max-w-[720px] rounded-full border border-white/5" aria-hidden />
          <div className="pointer-events-none absolute bottom-[-40%] right-[-2%] h-[42vw] max-h-[580px] w-[42vw] max-w-[580px] rounded-full border border-white/5" aria-hidden />

          <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-14 text-center md:pb-16 md:pt-20">
            <h1 className="text-balance text-[2.1rem] font-black leading-[1.2] tracking-tight text-[#f6f1e8] sm:text-5xl md:text-[3.2rem]">
              دقیقاً چه چیزی می‌گیری.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-[#f6f1e8]/75 md:text-[15px]">
              این صفحه فقط چیزهایی را می‌نویسد که همین حالا کار می‌کنند. چیزهایی که هنوز نساخته‌ایم
              هم پایین همین صفحه آمده‌اند — چون اگر پنهانشان می‌کردیم، بقیه‌ی این فهرست هم قابل
              اعتماد نبود.
            </p>

            {/* A spine for a long page: four stops, always reachable. */}
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {[
                { href: "#visitor", label: "برای بازدیدکننده" },
                { href: "#owner", label: "برای صاحب کسب‌وکار" },
                { href: "#promises", label: "دو قولی که نمی‌شکنیم" },
                { href: "#coming", label: "چیزهایی که نداریم" },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-[#f6f1e8]/90 backdrop-blur transition hover:border-white/35 hover:bg-white/15 md:text-[13px]"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ── Act one: the visitor ────────────────────────────────── */}
        <ActHeader id="visitor" title="برای تو که دنبال کسب‌وکار می‌گردی" accent="lajvard" />

        <Section
          title="بدون حساب، بدون هزینه"
          note="هیچ‌کدام از این‌ها ثبت‌نام نمی‌خواهد."
          accent="lajvard"
          items={VISITOR_FREE}
        />

        <Section
          title="اگر حساب رایگان بسازی، چهار چیز اضافه"
          note="حساب رایگان است و همیشه رایگان می‌ماند."
          accent="lajvard"
          items={VISITOR_ACCOUNT}
          alt
        />

        {/* ── Act two: the owner ──────────────────────────────────── */}
        <ActHeader
          id="owner"
          title="برای صاحب کسب‌وکار"
          subtitle="سه پلن، و مرزهای صریحشان"
          note="عددهای زیر همان عددهایی هستند که سرور اعمال می‌کند — از یک جا خوانده می‌شوند، پس نمی‌توانند با هم فرق کنند."
          accent="annabi"
        />

        <Section
          plan={PLANS.free.name}
          title="رایگان، برای همیشه"
          note={PLANS.free.tagline}
          accent="lajvard"
          items={[...OWNER_FREE, OWNER_JOBS]}
        />

        <Section
          plan={PLANS.pro.name}
          title={`هر چیزی که در ${PLANS.free.name} هست، به‌علاوه‌ی این‌ها`}
          note={PLANS.pro.tagline}
          accent="mesi"
          items={OWNER_STARTER}
          alt
        />

        <Section
          plan={PLANS.featured.name}
          title={`هر چیزی که در ${PLANS.pro.name} هست، به‌علاوه‌ی این‌ها`}
          note={PLANS.featured.tagline}
          accent="annabi"
          items={OWNER_PREMIUM}
        />

        {/* ── The two rules that shape every row above ─────────────
            Inverted on purpose: these are not features, they are the
            constraints the feature list is written under, and they were
            rendered as the quietest thing on the page. */}
        <section id="promises" className="scroll-mt-20 border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-16">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[#14213d] p-7 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,rgba(122,24,49,0.55)_0%,transparent_55%)]" aria-hidden />
            <div className="relative">
              <h2 className="text-xl font-black text-[#f6f1e8] md:text-2xl">دو قولی که نمی‌شکنیم</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="border-t border-white/15 pt-5">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                    <BadgeCheck size={17} />
                  </div>
                  <p className="text-sm leading-8 text-[#f6f1e8]/80">
                    <strong className="block font-black text-[#f6f1e8]">نشان تأیید فروشی نیست.</strong>
                    در هر پلنی، حتی رایگان، فقط با اثبات شماره یا ایمیل به دست می‌آید.
                  </p>
                </div>
                <div className="border-t border-white/15 pt-5">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold)]">
                    <Sparkles size={17} />
                  </div>
                  <p className="text-sm leading-8 text-[#f6f1e8]/80">
                    <strong className="block font-black text-[#f6f1e8]">«ویژه» همیشه برچسب دارد.</strong>
                    آگهی پولی بالای فهرست می‌آید، ولی با نشانه‌ی صریح — نه پنهانی.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Not built yet ───────────────────────────────────────── */}
        <section id="coming" className="scroll-mt-20 border-t border-[color:var(--line)] bg-white px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">چیزهایی که هنوز نداریم</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)]">
              این‌ها ساخته نشده‌اند. اگر جایی در پلازا خلافش را دیدی، آن یک اشتباه است و
              می‌خواهیم بدانیم.
            </p>
            <ul className="mt-7 grid gap-x-10 sm:grid-cols-2">
              {COMING.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-3 border-t border-[color:var(--line)] py-3.5 text-[13px] leading-7 text-[color:var(--muted-text)]"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full border border-[color:var(--muted-text)]/50" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Where to go next — links, not restated content */}
        <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-14">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
            <Link
              href="/dashboard/business/new"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-7 text-[15px] font-black text-[#f6f1e8] shadow-[0_14px_34px_rgba(122,24,49,0.24)] transition hover:bg-[#5A1124]"
            >
              ثبت رایگان کسب‌وکار <ArrowLeft size={16} />
            </Link>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <NextLink href="/pricing" label="قیمت‌ها و پرداخت" />
              <NextLink href="/trust" label="چطور تأیید می‌کنیم" />
              <NextLink href="/how-it-works" label="چطور کار می‌کند" />
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

/** Accent per act/tier. Full literal class strings: Tailwind only ships a
 *  class it can see, so these cannot be built by interpolation. */
const ACCENT = {
  lajvard: {
    rule: "bg-[color:var(--lajvard)]",
    chipBg: "bg-[color:var(--lajvard)]/8",
    chipText: "text-[color:var(--lajvard)]",
    planChip: "bg-[color:var(--lajvard)] text-[#f6f1e8]",
  },
  annabi: {
    rule: "bg-[color:var(--annabi)]",
    chipBg: "bg-[color:var(--annabi)]/8",
    chipText: "text-[color:var(--annabi)]",
    planChip: "bg-[color:var(--annabi)] text-[#f6f1e8]",
  },
  mesi: {
    rule: "bg-[color:var(--mesi)]",
    chipBg: "bg-[color:var(--mesi)]/10",
    chipText: "text-[color:var(--mesi)]",
    planChip: "bg-[color:var(--mesi)] text-[#f6f1e8]",
  },
} as const;

type Accent = keyof typeof ACCENT;

/** Opens an act. Two of these are the only full-width breaks on the page,
 *  so «برای بازدیدکننده» and «برای صاحب کسب‌وکار» stop looking like two
 *  more feature sections. */
function ActHeader({
  id, title, subtitle, note, accent,
}: {
  id: string; title: string; subtitle?: string; note?: string; accent: Accent;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-[color:var(--line)] bg-white px-4 pb-2 pt-14 md:pt-16">
      <div className="mx-auto max-w-5xl">
        <span className={`block h-1 w-12 rounded-full ${ACCENT[accent].rule}`} aria-hidden />
        <h2 className="mt-5 text-balance text-[1.6rem] font-black leading-tight text-[color:var(--text)] md:text-4xl">
          {title}
          {subtitle ? (
            <span className="mt-2 block text-lg font-bold text-[color:var(--muted-text)] md:text-xl">
              {subtitle}
            </span>
          ) : null}
        </h2>
        {note ? (
          <p className="mt-3 max-w-2xl text-sm leading-8 text-[color:var(--muted-text)]">{note}</p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * One list of features.
 *
 * Not cards: the page had 22 identically-sized bordered boxes, which is the
 * structure that made it read as a wall rather than a specification. Rows on
 * hairlines, with the first item of each list given the full width and a
 * larger size, so every section has something to land on.
 */
function Section({
  plan, title, note, items, accent, alt,
}: {
  plan?: string; title: string; note: string; items: Item[]; accent: Accent; alt?: boolean;
}) {
  const [lead, ...rest] = items;
  const a = ACCENT[accent];
  return (
    <section className={`px-4 py-12 md:py-14 ${alt ? "bg-[color:var(--bg)]" : "bg-white"}`}>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          {plan ? (
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${a.planChip}`}>{plan}</span>
          ) : null}
          <h3 className="text-lg font-black text-[color:var(--text)] md:text-xl">{title}</h3>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-7 text-[color:var(--muted-text)]">{note}</p>

        {/* A long body in a half-width column leaves a hole beside it, so
            anything substantially longer than a normal row takes the full
            width. Measured from the copy, not tuned by eye: the two that
            qualify today are the jobs rules and the owner-name rule, both
            of which are policy rather than a feature line. */}
        <div className="mt-8 grid gap-x-10 md:grid-cols-2">
          <Row item={lead} accent={accent} lead />
          {rest.map((it) => (
            <Row key={it.title} item={it} accent={accent} wide={it.body.length > 200} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({
  item, accent, lead, wide,
}: {
  item: Item; accent: Accent; lead?: boolean; wide?: boolean;
}) {
  const a = ACCENT[accent];
  return (
    <div
      className={`group flex items-start gap-4 border-t border-[color:var(--line)] py-5 ${lead || wide ? "md:col-span-2" : ""}`}
    >
      <span
        className={`mt-0.5 inline-flex flex-none items-center justify-center rounded-xl transition group-hover:scale-105 ${a.chipBg} ${a.chipText} ${lead ? "h-12 w-12" : "h-10 w-10"}`}
        aria-hidden
      >
        {item.icon}
      </span>
      <div className="min-w-0">
        <h4 className={`font-black leading-6 text-[color:var(--text)] ${lead ? "text-[17px] md:text-lg" : "text-[15px]"}`}>
          {item.title}
        </h4>
        <p className={`mt-1.5 leading-8 text-[color:var(--muted-text)] ${lead ? "max-w-3xl text-sm" : wide ? "max-w-3xl text-[13px]" : "text-[13px]"}`}>
          {item.body}
        </p>
      </div>
    </div>
  );
}

function NextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 font-bold text-[color:var(--text)] underline decoration-[color:var(--line)] decoration-2 underline-offset-8 transition hover:decoration-[color:var(--annabi)]"
    >
      {label} <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
    </Link>
  );
}

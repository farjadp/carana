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
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/seo/local";
import { ANNOUNCEMENT_LIMITS, GALLERY_LIMITS, PLANS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "امکانات چارانا",
  description:
    "دقیقاً چه چیزی می‌گیری — برای کسی که دنبال کسب‌وکار می‌گردد، و برای صاحب کسب‌وکار. رایگان، استارتر و پریمیوم، بدون ادعای اضافه.",
  alternates: { canonical: "/features" },
};

const fa = (n: number) => n.toLocaleString("fa-IR");
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
    body: "آگهی استخدام کسب‌وکارهای ایرانی، با فیلتر شهر، نوع همکاری و اینکه کدام زبان لازم است. هر آگهی تاریخ انقضا دارد و بعد از آن خودبه‌خود برداشته می‌شود، پس چیزی که می‌بینی هنوز باز است. درخواست مستقیم به خود کسب‌وکار می‌رود؛ چارانا رزومه‌ای دریافت نمی‌کند.",
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
    title: "آدرس اختصاصی انگلیسی",
    body: "مثل charana.ca/b/dr-ahmadi — برای کارت ویزیت و اینستاگرام.",
  },
  {
    icon: <Star size={18} />,
    title: "جایگاه ویژه، با برچسب",
    body: "بالای فهرست شهر و دسته‌ی خودت و در جستجو — همیشه با نشان «ویژه». رتبه‌بندی پنهانی به نفع پرداخت‌کننده انجام نمی‌دهیم.",
  },
  {
    icon: <Sparkles size={18} />,
    title: "بخش ویژه‌ی صفحه‌ی اول",
    body: "در بالای صفحه‌ی نخست چارانا.",
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
  "رزرو نوبت واقعی داخل چارانا (الان فقط لینک به تقویم بیرونی است)",
  "نقشه‌ی جاسازی‌شده روی پروفایل",
  "اپ روی App Store و Google Play (فعلاً فقط دانلود مستقیم اندروید)",
  "اعلان از راه پیامک و پوش نوتیفیکیشن (فعلاً ایمیل و داخل پنل)",
  "مقاله‌ی وبلاگ اختصاصی برای کسب‌وکارهای پریمیوم",
  "نمایش چندشعبه‌ای روی نقشه",
  "لینک QR با ردیابی مبدأ در آمار",
  "ثبت آگهی استخدام از داخل اپ موبایل (فعلاً فقط خواندنی است و ثبت از وب‌سایت انجام می‌شود)",
  "ایمیل اطلاع‌رسانی نتیجه‌ی بررسی آگهی استخدام و یادآور نزدیک‌شدن به انقضا",
  "دریافت رزومه داخل چارانا (درخواست‌ها مستقیم به ایمیل، تلفن یا فرم خود کسب‌وکار می‌رود)",
];

export default function FeaturesPage() {
  return (
    <PageShell currentPath="/features" currentSection="business">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "امکانات", url: "/features" }])} />
      <main className="min-h-screen bg-[color:var(--bg)]" dir="rtl">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-12 text-center md:pt-16">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">امکانات</p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">
            دقیقاً چه چیزی می‌گیری.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--muted-text)] md:text-base">
            این صفحه فقط چیزهایی را می‌نویسد که همین حالا کار می‌کنند. چیزهایی که هنوز نساخته‌ایم
            هم پایین همین صفحه آمده‌اند — چون اگر پنهانشان می‌کردیم، بقیه‌ی این فهرست هم قابل
            اعتماد نبود.
          </p>
        </section>

        {/* ── Visitor ─────────────────────────────────────────────── */}
        <Band
          eyebrow="برای تو که دنبال کسب‌وکار می‌گردی"
          title="بدون حساب، بدون هزینه"
          note="هیچ‌کدام از این‌ها ثبت‌نام نمی‌خواهد."
        >
          <Grid items={VISITOR_FREE} />
        </Band>

        <Band
          eyebrow="اگر حساب رایگان بسازی"
          title="چهار چیز اضافه"
          note="حساب رایگان است و همیشه رایگان می‌ماند."
          alt
        >
          <Grid items={VISITOR_ACCOUNT} />
        </Band>

        {/* ── Owner ───────────────────────────────────────────────── */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">
              برای صاحب کسب‌وکار
            </p>
            <h2 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">
              سه پلن، و مرزهای صریحشان
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-[color:var(--muted-text)]">
              عددهای این جدول همان عددهایی هستند که سرور اعمال می‌کند — از یک جا خوانده می‌شوند،
              پس نمی‌توانند با هم فرق کنند.
            </p>
          </div>
        </section>

        <Band eyebrow={PLANS.free.name} title="رایگان، برای همیشه" note={PLANS.free.tagline}>
          <Grid items={[...OWNER_FREE, OWNER_JOBS]} />
        </Band>

        <Band
          eyebrow={PLANS.pro.name}
          title="هر چیزی که در رایگان هست، به‌علاوه‌ی این‌ها"
          note={PLANS.pro.tagline}
          alt
        >
          <Grid items={OWNER_STARTER} />
        </Band>

        <Band
          eyebrow={PLANS.featured.name}
          title={`هر چیزی که در ${PLANS.pro.name} هست، به‌علاوه‌ی این‌ها`}
          note={PLANS.featured.tagline}
        >
          <Grid items={OWNER_PREMIUM} />
        </Band>

        {/* Two promises — the rules that shape every row above */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14">
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-5">
              <BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-[color:var(--success,#0f7b4f)]" />
              <p className="text-sm leading-7 text-[color:var(--text)]">
                <strong className="font-black">نشان تأیید فروشی نیست.</strong> در هر پلنی، حتی
                رایگان، فقط با اثبات شماره یا ایمیل به دست می‌آید.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-5">
              <Sparkles className="mt-0.5 h-5 w-5 flex-none text-[color:var(--gold)]" />
              <p className="text-sm leading-7 text-[color:var(--text)]">
                <strong className="font-black">«ویژه» همیشه برچسب دارد.</strong> آگهی پولی بالای
                فهرست می‌آید، ولی با نشانه‌ی صریح — نه پنهانی.
              </p>
            </div>
          </div>
        </section>

        {/* ── Not built yet ───────────────────────────────────────── */}
        <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
              چیزهایی که هنوز نداریم
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted-text)]">
              این‌ها ساخته نشده‌اند. اگر جایی در چارانا خلافش را دیدی، آن یک اشتباه است و
              می‌خواهیم بدانیم.
            </p>
            <ul className="mt-5 space-y-2">
              {COMING.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2.5 rounded-xl border border-dashed border-[color:var(--line)] bg-white px-4 py-3 text-sm leading-7 text-[color:var(--text)]/75"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--muted-text)]/40" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Where to go next — links, not restated content */}
        <section className="border-t border-[color:var(--line)] bg-white px-4 py-14">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm">
            <NextLink href="/pricing" label="قیمت‌ها و پرداخت" />
            <NextLink href="/trust" label="چطور تأیید می‌کنیم" />
            <NextLink href="/how-it-works" label="چطور کار می‌کند" />
            <Link
              href="/dashboard/business/new"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-6 font-black text-[#f6f1e8] transition hover:bg-[#5c0000]"
            >
              ثبت رایگان کسب‌وکار <ArrowLeft size={15} />
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function Band({
  eyebrow, title, note, alt, children,
}: {
  eyebrow: string; title: string; note: string; alt?: boolean; children: React.ReactNode;
}) {
  return (
    <section className={`border-t border-[color:var(--line)] px-4 py-14 ${alt ? "bg-[color:var(--bg)]" : "bg-white"}`}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-1.5 text-xs font-bold text-[color:var(--lajvard)]">{eyebrow}</p>
        <h2 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)]">{note}</p>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  );
}

function Grid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.title} className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)]">
            {it.icon}
          </div>
          <h3 className="text-[15px] font-black leading-6 text-[color:var(--text)]">{it.title}</h3>
          <p className="mt-1.5 text-[13px] leading-7 text-[color:var(--muted-text)]">{it.body}</p>
        </div>
      ))}
    </div>
  );
}

function NextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-white px-5 font-bold text-[color:var(--text)] transition hover:border-[color:var(--annabi)]/40"
    >
      {label} <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
    </Link>
  );
}

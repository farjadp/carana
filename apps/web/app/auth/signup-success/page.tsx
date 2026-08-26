// ============================================================================
// Source: app/auth/signup-success/page.tsx
// Version: 2.0.0 — 2026-08-26
// Why: The first page a new account ever sees, and until now it wasted that.
//      v1 was three lines of implementation notes shown to a human —
//      «سشن کاربر هم فعال شده», «بعداً از همان‌جا پنل کسب‌وکار را گسترش
//      بدهیم» — which describes our build order, not their next move.
//
//      v2 answers the three questions somebody actually has at this moment:
//      what just happened, what can I do here, and what happens if I get
//      stuck. In that order, because the third one is why people leave.
//
//      EVERYTHING ON IT IS READ, NOT ASSUMED. The name, the email, whether
//      the email is confirmed, whether this person already owns a listing,
//      whether they have submitted a channel, and the live directory counts
//      all come from real state — so the «قدم بعدی» cards change to match
//      what is already done. A welcome screen that tells someone to register
//      a business they registered last week is the same class of lie as a
//      badge nothing backs; it is just wearing a friendlier voice.
// Env / Identity: Requires an authenticated session. noindex — it is a
//      per-account page and has nothing to rank for.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Briefcase,
  CheckCircle2,
  LifeBuoy,
  Newspaper,
  Radio,
  Search,
  Smartphone,
  Store,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { PageShell } from "@/components/page-shell";
import { company } from "@/lib/data/company";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "خوش آمدی",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** The gold corner mark used as a section bullet across the brand pages. */
function Notch() {
  return (
    <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden>
      <path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" />
    </svg>
  );
}

export default async function SignupSuccessPage() {
  const user = await requireUser("/auth/signup-success");
  const supabase = await createSupabaseServerClient();

  const fullName = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null;
  const firstName = fullName?.trim().split(/\s+/)[0] ?? null;

  // What this account already has. Both reads are cheap head-counts, and both
  // exist so the page can stop suggesting something that is already done.
  const [{ count: ownedBusinesses }, { count: submittedChannels }, stats] = await Promise.all([
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`),
    supabase.from("channels").select("id", { count: "exact", head: true }).eq("submitted_by", user.id),
    getDirectoryStats(),
  ]);

  const hasBusiness = (ownedBusinesses ?? 0) > 0;
  const hasChannel = (submittedChannels ?? 0) > 0;
  const emailConfirmed = !!user.email_confirmed_at;

  const steps = [
    {
      icon: Search,
      title: "یکی را پیدا کن",
      body: `${fa(stats.total)} کسب‌وکار ایرانی در ${fa(stats.cities)} شهر کانادا. فارسی بنویس یا انگلیسی — حتی اگر کیبورد اشتباه باشد، پیدایش می‌کنیم.`,
      cta: "شروع جستجو",
      href: "/search",
      tone: "primary" as const,
    },
    hasBusiness
      ? {
          icon: Store,
          title: "کسب‌وکارت را مدیریت کن",
          body: "کسب‌وکاری به نام تو ثبت شده. از پنل می‌توانی اطلاعاتش را ویرایش کنی، اعلان بگذاری، آگهی استخدام بزنی و آمار بازدیدش را ببینی.",
          cta: "پنل کسب‌وکار",
          href: "/dashboard/business",
          tone: "plain" as const,
        }
      : {
          icon: Store,
          title: "کسب‌وکارت را ثبت کن",
          body: "رایگان است و رایگان می‌ماند. اگر وب‌سایت داری فقط آدرسش را بده — نام، خدمات، راه‌های تماس و ساعت کاری را از آن می‌خوانیم و تو فقط تأیید می‌کنی.",
          cta: "ثبت کسب‌وکار",
          href: "/dashboard/business/new",
          tone: "plain" as const,
        },
    hasChannel
      ? {
          icon: Radio,
          title: "کانال‌هایت را ببین",
          body: "کانال یا گروهی ثبت کرده‌ای. وضعیت بررسی‌اش، و اگر لازم باشد تأیید دوباره‌اش، این‌جاست.",
          cta: "کانال‌های من",
          href: "/dashboard/channels",
          tone: "plain" as const,
        }
      : {
          icon: Radio,
          title: "کانال یا گروهت را معرفی کن",
          body: "کانال تلگرام یا گروه واتس‌اپ فارسی‌زبان داری؟ ثبتش رایگان است و لازم نیست کسب‌وکاری داشته باشی. ما تاریخ آخرین فعالیتش را هم نشان می‌دهیم.",
          cta: "ثبت کانال یا گروه",
          href: "/channels/submit",
          tone: "plain" as const,
        },
  ];

  const shortcuts = [
    { icon: Bookmark, title: "ذخیره‌ها و یادداشت‌ها", href: "/profile/interactions" },
    { icon: Newspaper, title: "مقالات", href: "/blog" },
    { icon: Briefcase, title: "فرصت‌های شغلی", href: "/jobs" },
    { icon: Smartphone, title: "اپ اندروید", href: "/download" },
  ];

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "استفاده از گوپلازا پولی است؟",
      a: (
        <>
          نه. جستجو رایگان است، ثبت کسب‌وکار رایگان است و رایگان می‌ماند، و ثبت آگهی استخدام و کانال هم
          رایگان است. <Link href="/pricing">پلن‌های پولی</Link> فقط برای جایگاه ویژه و امکانات اضافه‌اند —
          هیچ‌کدام شرط دیده‌شدن نیستند. گوپلازا واسطه‌ی هیچ معامله‌ای نیست و کمیسیون نمی‌گیرد.
        </>
      ),
    },
    {
      q: "نشان «مالکیت احرازشده» چیست و چطور می‌گیرمش؟",
      a: (
        <>
          یعنی صاحب کسب‌وکار ثابت کرده آن پروفایل مال اوست — با کد پیامکی به همان شماره‌ای که روی
          پروفایل است، یا با ایمیل. فروشی نیست و با هیچ پلنی نمی‌آید. ۶ ماه اعتبار دارد و ۳۰ روز قبل
          از پایان برای تمدید ایمیل می‌فرستیم؛ اگر شماره‌ی پروفایل عوض شود، نشان تا احراز دوباره
          برداشته می‌شود. اگر کسب‌وکارت از قبل در سایت هست، از <Link href="/claim">صفحه‌ی احراز مالکیت</Link>{" "}
          تحویلش بگیر.
        </>
      ),
    },
    {
      q: "چرا چیزی که ثبت کردم فوراً منتشر نشد؟",
      a: (
        <>
          چون یک آدم نگاهش می‌کند. کسب‌وکارها معمولاً ظرف ۲ تا ۵ روز کاری، و نظرها و کانال‌ها هم پیش از
          انتشار بررسی می‌شوند. اگر رد شد، دلیلش را می‌نویسیم و همان‌جا در پنل می‌بینی — نه یک «رد شد»
          خالی.
        </>
      ),
    },
    {
      q: "یادداشت‌های خصوصی‌ام را چه کسی می‌بیند؟",
      a: (
        <>
          فقط خودت. «ذخیره» و «یادداشت» برای خودت‌اند («رفتم، خوب بود»، «قیمت گرفتم») و در هیچ صفحه‌ی
          عمومی‌ای نمی‌آیند. نظر عمومی چیز جداگانه‌ای است و پس از بررسی منتشر می‌شود.
        </>
      ),
    },
    {
      q: "این‌همه کسب‌وکار از کجا آمده؟ مال خودشان می‌دانند؟",
      a: (
        <>
          بخش بزرگی از فهرست اولیه از منابع عمومی گردآوری شده و هنوز صاحبش تحویلش نگرفته. برای همین
          نشان تأیید روی همه نیست: نشان یعنی کسی واقعاً ثابت کرده مالک است، نه این‌که ما اسمش را داریم.
          اگر کسب‌وکار توست، <Link href="/claim">احراز مالکیت</Link> در چند دقیقه انجام می‌شود.
        </>
      ),
    },
    {
      q: "اگر پشیمان شدم، حسابم را چطور حذف کنم؟",
      a: (
        <>
          از <Link href="/account/delete">صفحه‌ی حذف حساب</Link>، بدون نیاز به تماس با ما. آنچه نگه
          می‌داریم و آنچه پاک می‌شود در <Link href="/privacy">حریم خصوصی</Link> نوشته شده.
        </>
      ),
    },
  ];

  return (
    <PageShell currentPath="/auth/signup-success" currentSection="business">
      <main className="page-main" dir="rtl">
        <div className="mx-auto max-w-4xl">
          {/* The welcome itself. Dark band, brand mark, and the account facts
              as chips — each one a thing we can actually assert. */}
          <section className="relative overflow-hidden rounded-3xl bg-[color:var(--text)] px-6 py-10 text-[#f6f1e8] md:px-10 md:py-12">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[color:var(--annabi)]/35 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-20 right-[-10%] h-64 w-64 rounded-full bg-[#c9a24b]/20 blur-[90px]" />

            <div className="relative">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 text-xs font-bold">
                <CheckCircle2 size={14} /> حساب ساخته شد
              </span>

              <h1 className="text-3xl font-black leading-tight md:text-4xl">
                {firstName ? `${firstName}، خوش آمدی به گوپلازا.` : "خوش آمدی به گوپلازا."}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-8 text-[#f6f1e8]/85">
                از این‌جا به بعد دیگر فقط یک بازدیدکننده نیستی: می‌توانی کسب‌وکارها را ذخیره کنی، برای
                خودت یادداشت بگذاری، کسب‌وکار یا کانالت را ثبت کنی و آماری ببینی که فقط مال توست.
              </p>

              <ul className="mt-6 flex flex-wrap gap-2 text-xs">
                <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                  <CheckCircle2 size={13} /> وارد شده‌ای — لازم نیست دوباره وارد شوی
                </li>
                {user.email ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5" dir="ltr">
                    {user.email}
                  </li>
                ) : null}
                {/* Said only when it is true. An unconfirmed address that
                    claims to be confirmed is how password resets get lost. */}
                {emailConfirmed ? (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                    <BadgeCheck size={13} /> ایمیلت تأیید شده
                  </li>
                ) : (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-[#c9a24b]/25 px-3 py-1.5">
                    ایمیلت هنوز تأیید نشده — لینک تأیید را برایت فرستاده‌ایم
                  </li>
                )}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f6f1e8] px-6 py-3 text-sm font-black text-[#14213d] transition hover:bg-white"
                >
                  ورود به پروفایل <ArrowLeft size={16} />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-[#f6f1e8] transition hover:bg-white/10"
                >
                  بازگشت به خانه
                </Link>
              </div>
            </div>

            {/* BrandMark takes no className, so the positioning lives on a
                wrapper rather than being forced through the component. */}
            <span className="pointer-events-none absolute -bottom-8 left-6 opacity-[0.07] md:left-10">
              <BrandMark size={150} color="#f6f1e8" />
            </span>
          </section>

          {/* Next steps. The middle two cards change to match what this
              account already has — nothing here suggests a thing that is done. */}
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
              <Notch /> از کجا شروع کنیم؟
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, body, cta, href, tone }) => (
                <div
                  key={title}
                  className={`flex flex-col rounded-3xl border bg-white p-6 transition hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] ${
                    tone === "primary" ? "border-[color:var(--lajvard)]" : "border-[color:var(--line)]"
                  }`}
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)]">
                    <Icon size={19} />
                  </span>
                  <h3 className="mb-2 text-base font-black text-[color:var(--text)]">{title}</h3>
                  <p className="mb-5 flex-1 text-sm leading-7 text-[color:var(--muted-text)]">{body}</p>
                  <Link
                    href={href}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      tone === "primary"
                        ? "bg-[color:var(--lajvard)] text-white hover:opacity-90"
                        : "border border-[color:var(--line)] text-[color:var(--text)] hover:border-[color:var(--lajvard)]"
                    }`}
                  >
                    {cta} <ArrowLeft size={14} />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Shortcuts */}
          <section className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
              <Notch /> چیزهای دیگری که این‌جا هست
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {shortcuts.map(({ icon: Icon, title, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4 transition hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)]">
                    <Icon size={17} />
                  </span>
                  <span className="flex-1 text-sm font-bold text-[color:var(--text)]">{title}</span>
                  <ArrowLeft
                    size={14}
                    className="text-[color:var(--muted-text)] transition group-hover:-translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ. Native details/summary — the same pattern as /support, so it
              works with JavaScript off and needs no state. */}
          <section className="mt-12">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
              <Notch /> سؤال‌هایی که تازه‌واردها می‌پرسند
            </h2>
            <div className="divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-white">
              {faqs.map((f) => (
                <details key={f.q} className="group px-5 md:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold text-[color:var(--text)]">
                    <span>{f.q}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg)] text-lg leading-none text-[color:var(--muted-text)] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="-mt-1 pb-5 text-sm leading-[1.9] text-[color:var(--text)]/80 [&_a]:font-bold [&_a]:text-[color:var(--lajvard)]">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Where to go when stuck. The reason people leave a new account is
              that nothing told them this existed. */}
          <section className="mt-8 flex flex-col gap-4 rounded-3xl bg-[color:var(--bg)] p-6 md:flex-row md:items-center md:p-7">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--annabi)]">
              <LifeBuoy size={22} />
            </span>
            <div className="flex-1">
              <p className="font-black text-[color:var(--text)]">گیر کردی؟ جواب بیشترشان نوشته شده.</p>
              <p className="mt-0.5 text-sm leading-7 text-[color:var(--muted-text)]">
                <Link href="/support" className="font-bold text-[color:var(--lajvard)]">
                  صفحه‌ی پشتیبانی
                </Link>{" "}
                پرسش‌های پرتکرار را کامل‌تر جواب می‌دهد. اگر آن‌جا هم نبود، ایمیل بزن — معمولاً ظرف یک تا
                دو روز کاری جواب می‌دهیم.
              </p>
            </div>
            <a
              href={`mailto:${company.email.support}`}
              dir="ltr"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--line)] bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)]"
              style={{ fontFamily: "var(--font-latin)" }}
            >
              {company.email.support}
            </a>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

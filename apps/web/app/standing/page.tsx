// ============================================================================
// Source: app/standing/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The public explanation of «اعتبار مشارکت» — what the points are, how a
//      contribution becomes one, what the levels unlock, and what the system
//      deliberately refuses to do.
//
//      NOT ONE NUMBER ON THIS PAGE IS HARD-CODED. Point values come from
//      standing_rules and the thresholds from site_settings, both live. The
//      whole economy is admin-tunable (docs/16, the green list), so a page
//      that printed "۲۵ امتیاز" would start lying the first time Farjad
//      changed a field — and it already has: business_edit is 8, not the 10
//      it was seeded with. A public explainer of a tunable system has to read
//      the system.
//
//      IT ALSO SAYS WHEN IT IS OFF. The programme currently records
//      contributions as pending but settles nothing, and the banner says
//      exactly that rather than describing a live benefit. It disappears on
//      its own when the switch is flipped — nothing here has to be edited.
// Env / Identity: Public, no auth. Reads through the service role because
//      standing_rules is admin-read-only under RLS; nothing user-specific is
//      fetched, so there is nothing to leak.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { BADGE_FAMILIES, LEVEL_LABELS_FA, ROMAN } from "@goplaza/core";

import { InnerPage } from "@/components/inner-page";
import { getRules, getStandingSettings } from "@/lib/standing/rules";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = {
  alternates: { canonical: "/standing" },
  title: "اعتبار مشارکت",
  description:
    "امتیاز مشارکت در پلازا وقتی شمرده می‌شود که کاری که کرده‌ای تأیید شود — نه وقتی ثبتش می‌کنی.",
};

export const dynamic = "force-dynamic";


export default async function StandingExplainerPage() {
  const [settings, rules] = await Promise.all([getStandingSettings(), getRules()]);
  const active = rules.filter((r) => r.enabled);
  const t = settings.thresholds;

  return (
    <InnerPage
      currentPath="/standing"
      currentSection="business"
      hero="wash"
      eyebrow="اعتبار مشارکت"
      title="امتیاز وقتی شمرده می‌شود که درست از آب دربیاید"
      description="پلازا را آدم‌ها کامل می‌کنند: کانالی که ثبت می‌شود، ساعت کاری‌ای که اصلاح می‌شود، نظری که نوشته می‌شود. این صفحه می‌گوید این مشارکت‌ها چطور شمرده می‌شوند و چه چیزی باز می‌کنند."
    >
      {!settings.enabled ? (
        <section className="mb-8 rounded-2xl border border-amber-400/60 bg-amber-50/40 p-5">
          <p className="text-sm font-black text-[color:var(--text)]">
            این برنامه هنوز فعال نشده است.
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted-text)]">
            مشارکت‌های تو همین حالا هم ثبت می‌شوند و در حالت «در انتظار» می‌مانند،
            ولی هنوز هیچ امتیازی تسویه نمی‌شود و هیچ سطحی چیزی باز نمی‌کند. وقتی
            فعال شود، آنچه تا آن روز ثبت شده از دست نمی‌رود. آنچه در ادامه
            می‌خوانی، توضیح همان چیزی است که قرار است کار کند.
          </p>
        </section>
      ) : null}

      {/* 1. The one idea. */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
          امتیاز داده نمی‌شود؛ تسویه می‌شود
        </h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--text)]">
          در بیشتر سیستم‌های امتیازی، همان لحظه که کاری می‌کنی امتیازش را
          می‌گیری. برای یک دایرکتوری این غلط است، چون ارزش ما حجم مشارکت نیست،
          <b> درست بودنش</b> است. پس هر مشارکت سه حالت دارد:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["در انتظار", "ثبتش کردی. عدد دیده می‌شود ولی هنوز شمرده نشده."],
            ["تأیید شد", "چیزی مستقل تأییدش کرد — مدیریت منتشرش کرد، یا سیستم خودش بررسی‌اش کرد."],
            ["بازپس‌گرفته", "بعداً معلوم شد اشتباه بوده. امتیاز برمی‌گردد و در دفترچه‌ات می‌ماند."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[color:var(--line)] p-4">
              <div className="text-sm font-black text-[color:var(--text)]">{k}</div>
              <p className="mt-1 text-xs leading-6 text-[color:var(--muted-text)]">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-[color:var(--muted-text)]">
          یعنی عددی که می‌بینی نمی‌گوید «چقدر کار کردی»، می‌گوید <b>چقدر از
          کارت درست بوده</b>.
        </p>
      </section>

      {/* 2. What counts — live from standing_rules. */}
      {active.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">چه چیزی شمرده می‌شود</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--line)]">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-right text-xs text-[color:var(--muted-text)]">
                  <th className="p-3 font-normal">مشارکت</th>
                  <th className="p-3 font-normal">امتیاز</th>
                  <th className="p-3 font-normal">سقف روزانه</th>
                </tr>
              </thead>
              <tbody>
                {active.map((r) => (
                  <tr key={r.kind} className="border-t border-[color:var(--line)]">
                    <td className="p-3 text-[color:var(--text)]">{r.label_fa}</td>
                    <td className="p-3 font-bold" dir="ltr">{fa(r.points)}</td>
                    <td className="p-3 text-[color:var(--muted-text)]" dir="ltr">{fa(r.daily_cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-6 text-[color:var(--muted-text)]">
            سقف روزانه یعنی بیشتر از این تعداد در یک روز تسویه نمی‌شود — بقیه
            «در انتظار» می‌مانند و روزهای بعد تسویه می‌شوند، نه اینکه دور
            ریخته شوند. فقط حسابی که ایمیل یا موبایلش تأیید شده امتیاز می‌گیرد،
            و مشارکت روی کسب‌وکار خودت امتیاز ندارد.
          </p>
        </section>
      ) : null}

      {/* 3. Levels — live thresholds. */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">چهار سطح</h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-text)]">
          هر سطح یک چیز واقعی باز می‌کند. سطحی که چیزی باز نکند، وجود ندارد.
        </p>
        <div className="mt-4 space-y-3">
          {[
            {
              level: 0,
              needs: "—",
              unlocks: "هنوز چیزی. همه‌ی پیشنهادها به صف بررسی می‌روند.",
            },
            {
              level: 1,
              needs: `${fa(t.level1.xp)} امتیاز · ${fa(t.level1.confirmed)} مشارکت تأییدشده · دقت ${fa(Math.round(t.level1.accuracy * 100))}٪ · ${fa(t.level1.kinds)} نوع متفاوت`,
              unlocks: "پیشنهادهایت زودتر از بقیه بررسی می‌شوند.",
            },
            {
              level: 2,
              needs: `${fa(t.level2.xp)} امتیاز · ${fa(t.level2.confirmed)} مشارکت تأییدشده · دقت ${fa(Math.round(t.level2.accuracy * 100))}٪ · ${fa(t.level2.kinds)} نوع متفاوت`,
              unlocks:
                "اصلاح ساعت کاری و وضعیت شلوغی بدون صف منتشر می‌شود — و بعداً بازبینی می‌شود.",
            },
            {
              level: 3,
              needs: "با تصمیم مدیریت، نه با امتیاز",
              unlocks: "دسترسی خواندنی به صف بررسی و امکان علامت‌گذاری برای مدیریت.",
            },
          ].map((row) => (
            <div key={row.level} className="rounded-xl border border-[color:var(--line)] p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-black text-[color:var(--text)]">
                  {LEVEL_LABELS_FA[row.level as 0 | 1 | 2 | 3]}
                </span>
                <span className="text-xs text-[color:var(--muted-text)]">{row.needs}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--text)]">{row.unlocks}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-6 text-[color:var(--muted-text)]">
          «نوع متفاوت» عمدی است: با دویست بار تکرار یک کار نمی‌شود بالا رفت.
          سطح «نگهبان» هم هیچ‌وقت خودکار داده نمی‌شود — اختیار بررسی را
          الگوریتم توزیع نمی‌کند.
        </p>
      </section>

      {/* 4. Decay + accuracy. */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
          سطح نگه داشته می‌شود، نه گرفته
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--line)] p-4">
            <div className="text-sm font-black text-[color:var(--text)]">نبودن</div>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted-text)]">
              اگر {fa(settings.maintenance_window_days)} روز مشارکت تأییدشده‌ای
              نداشته باشی، سطحت به صفر برمی‌گردد. امتیاز و بالاترین سطحی که
              رسیده‌ای سر جایشان می‌مانند، و با یک مشارکت تأییدشده دوباره
              برمی‌گردی.
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--line)] p-4">
            <div className="text-sm font-black text-[color:var(--text)]">اشتباه بودن</div>
            <p className="mt-1 text-sm leading-6 text-[color:var(--muted-text)]">
              اگر نسبت مشارکت‌های درستت از کف سطحت پایین‌تر بیفتد، همان لحظه
              پایین می‌آیی — منتظر پایان هیچ دوره‌ای نمی‌ماند. نبودن مهلت دارد؛
              اشتباه بودن ندارد.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Badges. */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">نشان‌ها</h2>
        <p className="mt-2 text-sm leading-7 text-[color:var(--muted-text)]">
          نشان‌ها <b>هیچ چیزی باز نمی‌کنند</b>. سطح یعنی اجازه، نشان یعنی
          خاطره — اگر نشان هم اجازه بدهد، می‌شود سیستم دوم و چیز دومی برای
          دور زدن. هر خانواده پنج پله دارد و فقط مشارکت‌های تأییدشده را
          می‌شمارد.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {BADGE_FAMILIES.map((b) => (
            <span
              key={b.key}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm"
            >
              <span>{b.emoji}</span>
              <b className="text-[color:var(--text)]">{b.labelFa}</b>
              <span className="text-xs text-[color:var(--muted-text)]" dir="ltr">
                {ROMAN[1]}–{ROMAN[5]}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* 6. The refusals — the part that makes the rest believable. */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
          چیزهایی که این سیستم عمداً نیست
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text)]">
          <li>
            · <b>خریدنی نیست.</b> هیچ پلنی امتیاز یا سطح نمی‌دهد و هیچ‌وقت
            نخواهد داد.
          </li>
          <li>
            · <b>روی اعتبار کسب‌وکارها اثر ندارد.</b> امتیاز تو مال توست؛ آنچه
            بازدیدکننده درباره‌ی یک کسب‌وکار می‌بیند فقط شواهد خودِ آن
            کسب‌وکار است — تأیید تلفن و ایمیل، سابقه، نظرها. <Link href="/trust" className="underline">اعتماد و بررسی</Link>.
          </li>
          <li>
            · <b>جدول رتبه‌بندی ندارد.</b> فهرست عمومی از اینکه چه کسی بیشتر
            امتیاز دارد وجود ندارد و ساخته نمی‌شود. دفترچه‌ی هر کس فقط برای
            خودش دیده می‌شود.
          </li>
          <li>
            · <b>ارز و فروشگاه ندارد.</b> امتیاز خرج نمی‌شود؛ فقط در را باز
            می‌کند.
          </li>
          <li>
            · <b>ورود روزانه امتیاز ندارد.</b> باز کردن صفحه کاری نیست که
            پاداش داشته باشد.
          </li>
        </ul>
      </section>

      {settings.enabled && settings.public_display ? (
        <section className="mb-6">
          <Link
            href="/profile/standing"
            className="inline-flex h-11 items-center rounded-full bg-[color:var(--text)] px-6 text-sm font-bold text-[#f6f1e8]"
          >
            دفترچه‌ی مشارکت من
          </Link>
        </section>
      ) : null}
    </InnerPage>
  );
}

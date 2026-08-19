// ============================================================================
// Source: app/not-found.tsx
// Version: 2.0.0 — 2026-08-16
// Why: A 404 that behaves like the rest of the site — the mark, one honest
//      line, a real search box (the most useful thing on a dead end), and the
//      main doors. v1 was a bare hero with two buttons.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Compass, LayoutGrid, MapPin, Search } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "صفحه پیدا نشد", robots: { index: false } };

const DOORS = [
  { href: "/categories", label: "دسته‌بندی‌ها", hint: "۱۲ دسته، از پزشک تا رستوران", icon: LayoutGrid },
  { href: "/cities", label: "شهرها", hint: "تورنتو، ونکوور، مونترال…", icon: MapPin },
  { href: "/businesses", label: "همه کسب‌وکارها", hint: "فهرست کامل، تأییدشده‌ها اول", icon: Building2 },
  { href: "/how-it-works", label: "چطور کار می‌کند", hint: "گوپلازا چیست و نشان تأیید یعنی چه", icon: Compass },
];

export default function NotFound() {
  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="relative min-h-[70vh] overflow-hidden bg-[color:var(--bg)]">
        {/* Watermark: the mark, oversized and faint, off the corner */}
        <div className="pointer-events-none absolute -left-24 -top-24 opacity-[0.06]" aria-hidden>
          <BrandMark size={520} color="var(--annabi)" simple />
        </div>

        <section className="relative mx-auto max-w-4xl px-4 pb-16 pt-14 text-center md:pt-20">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-[0_16px_40px_rgba(20,33,61,0.08)]">
            <BrandMark size={38} color="var(--annabi)" />
          </div>
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-[color:var(--annabi)]" dir="ltr">۴۰۴</p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">این‌جا چیزی نیست.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-[color:var(--muted-text)] md:text-base">
            شاید لینک قدیمی باشد، شاید کسب‌وکاری که دنبالش بودی هنوز ثبت نشده. چیزی که می‌خواهی را همین‌جا جستجو کن — فارسی یا انگلیسی، حتی با کیبورد اشتباه.
          </p>

          <form action="/search" method="get" role="search" className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-[color:var(--line)] bg-white p-1.5 pr-4 shadow-[0_16px_40px_rgba(20,33,61,0.08)] focus-within:border-[color:var(--annabi)]/40 focus-within:shadow-[0_0_0_4px_rgba(122,24,49,0.08)]">
            <Search size={18} className="text-[color:var(--muted-text)]" aria-hidden />
            <input
              name="q"
              placeholder="مثلاً دندان‌پزشک، رستوران، ریچموندهیل…"
              aria-label="جستجو در گوپلازا"
              className="h-11 flex-1 bg-transparent text-[15px] text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted-text)]"
            />
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-5 font-bold text-[#f6f1e8] transition hover:bg-[#5A1124]">
              جستجو
            </button>
          </form>

          <div className="mt-12 grid grid-cols-1 gap-3 text-right sm:grid-cols-2">
            {DOORS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="group flex items-center gap-4 rounded-2xl border border-[color:var(--line)] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--lajvard)]/30 hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)]"
              >
                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[color:var(--lajvard)]/8 text-[color:var(--lajvard)]">
                  <d.icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-black text-[color:var(--text)]">{d.label}</span>
                  <span className="block text-xs text-[color:var(--muted-text)]">{d.hint}</span>
                </span>
                <ArrowLeft size={16} className="text-[color:var(--muted-text)] transition group-hover:-translate-x-1 group-hover:text-[color:var(--lajvard)]" />
              </Link>
            ))}
          </div>

          <p className="mt-10 text-xs text-[color:var(--muted-text)]">
            کسب‌وکار خودت را پیدا نکردی؟{" "}
            <Link href="/dashboard/business/new" className="font-bold text-[color:var(--annabi)]">رایگان ثبتش کن</Link>
            {" "}— یا{" "}
            <Link href="/support" className="font-bold text-[color:var(--lajvard)]">به ما بگو چه چیزی کم است</Link>.
          </p>
        </section>

        {/* Merlon row — the Persepolis motif from the brand book */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-[6px] opacity-60" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="block h-2 w-3 rounded-t-sm bg-[color:var(--gold)]" />
          ))}
        </div>
      </main>
    </PageShell>
  );
}

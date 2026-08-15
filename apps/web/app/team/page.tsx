// ============================================================================
// Source: app/team/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Who builds čārana. Facts from the company's own sites; no invented
//      titles, no stock faces. One founder today — that is the truth.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase, Globe, Handshake } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { BrandMark } from "@/components/brand-mark";
import { company } from "@/lib/data/company";

export const metadata: Metadata = { title: "معرفی تیم", description: "چه کسانی چارانا را می‌سازند." };

export default function TeamPage() {
  return (
    <InnerPage currentPath="/team" currentSection="brand" eyebrow="تیم" title="یک نفر، یک شرکت، یک جامعه." description="چارانا را آشاوید می‌سازد — و جامعه‌ای که هر روز با ثبت، احراز و نظر دادن کاملش می‌کند.">
      <section className="grid lg:grid-cols-12 gap-6" dir="rtl">
        <div className="lg:col-span-7 rounded-3xl bg-white border border-[color:var(--line)] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-3xl bg-[color:var(--annabi)] text-[#f6f1e8] text-3xl font-black flex items-center justify-center shrink-0">ف</div>
            <div className="min-w-0">
              <div className="text-xs text-[color:var(--muted-text)]">بنیان‌گذار و سازنده</div>
              <h2 className="text-2xl font-black text-[color:var(--text)]">فرجاد پورمحمد</h2>
              <div className="text-sm text-[color:var(--muted-text)]" dir="ltr" style={{ textAlign: "right" }}>Farjad Pourmohammad</div>
            </div>
          </div>
          <p className="mt-5 text-[15px] leading-[1.9] text-[color:var(--text)]/85">
            مشاور استراتژیک و مهندس سیستم. هفده سال در فناوری، بیش از ۲۵ استارتاپ منتورشده، بیش از ۳ میلیون دلار جذب‌شده توسط تیم‌هایی که همراهی کرده، سرممیز ISO 27001. ایده‌های مبهم، تیم‌های گیرکرده و عملیات دستی را به محصول و شرکتی تبدیل می‌کند که رشد مرکب داشته باشد — و چارانا دقیقاً همان مشکلی است که خودش به‌عنوان تازه‌وارد داشت: پیدا کردنِ آدم درست، به زبان خودش، در شهر خودش.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <a href="https://www.farjadp.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-[color:var(--bg)] hover:bg-[color:var(--line)] px-3 py-1.5 rounded-full font-bold text-[color:var(--text)] transition"><Globe size={13} /> farjadp.com</a>
            <a href={company.social.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-[color:var(--bg)] hover:bg-[color:var(--line)] px-3 py-1.5 rounded-full font-bold text-[color:var(--text)] transition"><Briefcase size={13} /> لینکدین</a>
            <Link href="/businesses/farjad-pourmohammad" className="inline-flex items-center gap-1.5 bg-[color:var(--annabi)]/8 hover:bg-[color:var(--annabi)]/12 px-3 py-1.5 rounded-full font-bold text-[color:var(--annabi)] transition">پروفایل در چارانا <ArrowLeft size={12} /></Link>
          </div>
        </div>

        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-12 opacity-10" aria-hidden><BrandMark size={200} color="#f6f1e8" simple /></div>
            <div className="relative">
              <div className="text-xs text-[#f6f1e8]/60">شرکت</div>
              <div className="text-xl font-black mt-1">{company.legalName}</div>
              <p className="text-sm text-[#f6f1e8]/80 leading-relaxed mt-3">شرکت اجرایی و تحول دیجیتال در تورنتو: سیستم‌های عملیاتی، اتوماسیون هوش مصنوعی و مسیرهای بنیان‌گذاری برای مهاجران. چارانا محصولِ خودِ آشاوید است — نه پروژه‌ی مشتری.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <a href={company.parentSite} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">ashavid.ca</a>
                <Link href="/businesses/ashavid" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">پروفایل در چارانا</Link>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-[color:var(--line)] p-6">
            <div className="font-black text-[color:var(--text)] flex items-center gap-2"><Handshake size={18} className="text-[color:var(--annabi)]" /> می‌خواهی بخشی از این باشی؟</div>
            <p className="text-sm text-[color:var(--muted-text)] leading-relaxed mt-2">داوطلب پاکسازی داده، سفیر شهر، یا همکار فنی — بنویس. تیم را از همین جامعه می‌سازیم.</p>
            <a href={`mailto:${company.email.partners}`} className="inline-block mt-3 text-sm font-bold text-[color:var(--lajvard)]" dir="ltr">{company.email.partners}</a>
          </div>
        </aside>
      </section>
    </InnerPage>
  );
}

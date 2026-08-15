// ============================================================================
// Source: app/contact/page.tsx
// Version: 3.0.0 — 2026-08-15
// Why: Real contact details for the operating company, in the brand. Apple
//      checks that the site identifies the same legal entity as the App Store
//      seller, so every address here comes from lib/data/company.ts. v3:
//      route-by-intent cards first (most people arrive with one of four
//      needs), the form second, company/social third.
// Env / Identity: Static page, public information only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Handshake, LifeBuoy, Mail, MapPin, ShieldCheck, Store, UserRoundX } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { BrandMark } from "@/components/brand-mark";
import { company } from "@/lib/data/company";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: `راه‌های تماس با ${company.brandFa}، محصولی از ${company.legalName} در تورنتو، کانادا.`,
};

const SOCIAL = [
  { href: company.social.instagram, label: "اینستاگرام" },
  { href: company.social.linkedin, label: "لینکدین" },
  { href: company.social.youtube, label: "یوتیوب" },
  { href: company.social.x, label: "ایکس" },
  { href: company.social.facebook, label: "فیسبوک" },
];

const INTENTS = [
  { icon: Store, title: "می‌خواهم کسب‌وکارم را ثبت کنم", body: "رایگان است؛ آدرس سایتت را بده و بقیه را ما پر می‌کنیم.", href: "/dashboard/business/new", cta: "شروع ثبت", tone: "annabi" as const },
  { icon: ShieldCheck, title: "کسب‌وکارم در سایت هست — مال من است", body: "با یک پیامک به شماره‌ی روی پروفایل، مالکیتت را ثابت کن و نشان تایید بگیر.", href: "/claim", cta: "احراز مالکیت", tone: "lajvard" as const },
  { icon: LifeBuoy, title: "مشکل فنی یا سؤال درباره‌ی حساب", body: "پرسش‌های پرتکرار و ایمیل مستقیم پشتیبانی.", href: "/support", cta: "پشتیبانی", tone: "plain" as const },
  { icon: Handshake, title: "همکاری، رسانه یا پیشنهاد", body: "برای شراکت، تبلیغات و هر چیزی که در دسته‌های دیگر نمی‌گنجد.", href: `mailto:${company.email.partners}`, cta: company.email.partners, tone: "plain" as const, ltr: true },
];

export default function ContactPage() {
  return (
    <InnerPage
      currentPath="/contact"
      currentSection="brand"
      eyebrow="تماس با ما"
      title="چطور می‌توانیم کمک کنیم؟"
      description="یکی از این چهار مسیر را انتخاب کن، یا همین‌جا پیام بگذار. معمولاً ظرف یک تا دو روز کاری جواب می‌دهیم."
    >
      {/* Route by intent */}
      <section className="grid md:grid-cols-2 gap-4" dir="rtl">
        {INTENTS.map(({ icon: Icon, title, body, href, cta, tone, ltr }) => (
          <IntentLink key={title} href={href} className={`group rounded-2xl p-5 border transition flex gap-4 ${
            tone === "annabi" ? "bg-[color:var(--annabi)] border-transparent text-[#f6f1e8] hover:bg-[#5c0000]"
            : tone === "lajvard" ? "bg-[color:var(--lajvard)]/8 border-[color:var(--lajvard)]/20 hover:bg-[color:var(--lajvard)]/12"
            : "bg-white border-[color:var(--line)] hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)]"}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              tone === "annabi" ? "bg-white/15" : tone === "lajvard" ? "bg-[color:var(--lajvard)]/12 text-[color:var(--lajvard)]" : "bg-[color:var(--bg)] text-[color:var(--annabi)]"}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-black">{title}</div>
              <p className={`text-sm mt-1 leading-relaxed ${tone === "annabi" ? "text-[#f6f1e8]/80" : "text-[color:var(--muted-text)]"}`}>{body}</p>
              <div className={`mt-2 text-xs font-bold inline-flex items-center gap-1 ${tone === "annabi" ? "text-[#f6f1e8]" : "text-[color:var(--lajvard)]"}`} dir={ltr ? "ltr" : undefined}>
                {cta} <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition" />
              </div>
            </div>
          </IntentLink>
        ))}
      </section>

      {/* Form + company */}
      <section className="mt-12 grid lg:grid-cols-12 gap-8" dir="rtl">
        <div className="lg:col-span-7 rounded-3xl bg-white border border-[color:var(--line)] p-6 md:p-7">
          <h2 className="text-xl font-black text-[color:var(--text)] flex items-center gap-2 mb-1"><Merlon /> پیام بفرست</h2>
          <p className="text-sm text-[color:var(--muted-text)] mb-5">به {company.email.support} می‌رسد. اگر درباره‌ی یک کسب‌وکار خاص است، اسمش را بنویس تا سریع‌تر پیدایش کنیم.</p>
          <ContactForm />
        </div>

        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-12 opacity-10" aria-hidden><BrandMark size={200} color="#f6f1e8" simple /></div>
            <div className="relative">
              <div className="flex items-center gap-2 text-xs text-[#f6f1e8]/60"><Building2 size={14} /> شرکت</div>
              <div className="text-lg font-black mt-1">{company.legalName}</div>
              <div className="text-sm text-[#f6f1e8]/75 mt-0.5 flex items-center gap-1.5"><MapPin size={14} /> {company.address}</div>
              <a href={company.parentSite} target="_blank" rel="noopener noreferrer" className="inline-block text-sm mt-3 underline underline-offset-4 text-[#f6f1e8]/85 hover:text-white">ashavid.ca</a>
              <div className="mt-5 pt-4 border-t border-white/10 text-xs text-[#f6f1e8]/60">شبکه‌ها</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SOCIAL.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition">{s.label}</a>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[color:var(--line)] p-6">
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted-text)] mb-3"><Mail size={14} /> ایمیل‌ها</div>
            <ul className="space-y-2.5 text-sm">
              {[
                ["عمومی", company.email.general],
                ["پشتیبانی", company.email.support],
                ["همکاری و تبلیغات", company.email.partners],
                ["حریم خصوصی", company.email.privacy],
              ].map(([l, e]) => (
                <li key={e} className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--muted-text)]">{l}</span>
                  <a href={`mailto:${e}`} className="font-bold text-[color:var(--lajvard)] [font-family:var(--font-latin)]" dir="ltr">{e}</a>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-[color:var(--line)] text-xs text-[color:var(--muted-text)] flex items-center gap-1.5">
              <UserRoundX size={13} /> حذف حساب کاربری: <Link href="/account/delete" className="text-[color:var(--lajvard)] font-bold">این صفحه</Link>
            </div>
          </div>
        </aside>
      </section>
    </InnerPage>
  );
}

/** next/link is for in-app routes; mailto: must be a plain anchor. */
function IntentLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith("mailto:") ? <a href={href} className={className}>{children}</a> : <Link href={href} className={className}>{children}</Link>;
}

function Merlon() {
  return <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg>;
}

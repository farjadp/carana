// ============================================================================
// Source: app/support/page.tsx
// Version: 1.0.0 — 2026-08-22
// Why: The Support URL required on an App Store listing. Has to be reachable
//      without signing in and actually answer common questions.
// Env / Identity: Static page.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import { LegalSection } from "@/components/legal-doc";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  title: "پشتیبانی",
  description:
    "راهنمای پشتیبانی چارانا: ثبت کسب‌وکار، اصلاح اطلاعات، حذف لیستینگ، مشکلات حساب کاربری.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "چطور کسب‌وکارم را ثبت کنم؟",
    a: (
      <>
        یک حساب بسازید و از <Link href="/dashboard/business/new">داشبورد</Link>{" "}
        فرم ثبت را کامل کنید. پس از ارسال، لیستینگ بررسی و سپس منتشر می‌شود.
      </>
    ),
  },
  {
    q: "کسب‌وکارم بدون اجازه‌ی من در سایت هست. چه کنم؟",
    a: (
      <>
        بخشی از لیستینگ‌های اولیه از منابع عمومی گردآوری شده‌اند. برای در اختیار
        گرفتن، اصلاح یا حذف کامل آن به{" "}
        <a href={`mailto:${company.email.support}`}>{company.email.support}</a>{" "}
        بنویسید و نام کسب‌وکار را ذکر کنید.
      </>
    ),
  },
  {
    q: "اطلاعات لیستینگم اشتباه است.",
    a: (
      <>
        اگر مالک آن هستید، از داشبورد ویرایشش کنید. تغییرات جزئی بلافاصله اعمال
        می‌شوند؛ تغییر نام، دسته‌بندی یا شهر پیش از انتشار بررسی می‌شود.
      </>
    ),
  },
  {
    q: "چرا لیستینگم هنوز منتشر نشده؟",
    a: <>هر لیستینگ پیش از انتشار بررسی می‌شود. اگر بیش از چند روز کاری طول کشید، به پشتیبانی بنویسید.</>,
  },
  {
    q: "نظری درباره‌ی کسب‌وکارم ثبت شده که نادرست است.",
    a: (
      <>
        به{" "}
        <a href={`mailto:${company.email.support}`}>{company.email.support}</a>{" "}
        گزارش دهید. نظرات خلاف واقعیت یا توهین‌آمیز حذف می‌شوند.
      </>
    ),
  },
  {
    q: "چطور حسابم را حذف کنم؟",
    a: (
      <>
        از صفحه‌ی <Link href="/account/delete">حذف حساب کاربری</Link>. این کار
        بدون نیاز به تماس با ما و به‌صورت آنی انجام می‌شود.
      </>
    ),
  },
  {
    q: "رمز عبورم را فراموش کرده‌ام.",
    a: (
      <>
        از <Link href="/auth/forgot-password">صفحه‌ی بازیابی رمز</Link> استفاده
        کنید.
      </>
    ),
  },
];

export default function SupportPage() {
  return (
    <InnerPage
      currentPath="/support"
      currentSection="brand"
      eyebrow="پشتیبانی"
      title="کمک می‌خواهید؟"
      description={`تیم ${company.brandFa} معمولاً ظرف یک تا دو روز کاری پاسخ می‌دهد.`}
    >
      <div className="legal-doc">
        <LegalSection title="تماس مستقیم">
          <p>
            پشتیبانی کاربران و کسب‌وکارها:{" "}
            <a href={`mailto:${company.email.support}`}>{company.email.support}</a>
            <br />
            همکاری و تبلیغات:{" "}
            <a href={`mailto:${company.email.partners}`}>{company.email.partners}</a>
            <br />
            حریم خصوصی و داده‌ها:{" "}
            <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>
          </p>
          <p>
            {company.legalName} — {company.address}
          </p>
        </LegalSection>

        <LegalSection title="پرسش‌های پرتکرار">
          <div className="faq-list">
            {FAQS.map((item) => (
              <div key={item.q} className="faq-item">
                <strong>{item.q}</strong>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </LegalSection>
      </div>
    </InnerPage>
  );
}

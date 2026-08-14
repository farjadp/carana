// ============================================================================
// Source: app/contact/page.tsx
// Version: 2.0.0 — 2026-08-22
// Why: Real contact details for the operating company. Apple checks that the
//      site identifies the same legal entity as the App Store seller.
// Env / Identity: Static page, public information only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

import { ContactForm } from "./contact-form";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  title: "ارتباط با ما | čārana",
  description: `راه‌های تماس با ${company.brandFa}، محصولی از ${company.legalName} در تورنتو، کانادا.`,
};

const SOCIAL = [
  { href: company.social.instagram, label: "اینستاگرام" },
  { href: company.social.linkedin, label: "لینکدین" },
  { href: company.social.youtube, label: "یوتیوب" },
  { href: company.social.x, label: "ایکس" },
  { href: company.social.facebook, label: "فیسبوک" },
];

export default function ContactPage() {
  return (
    <InnerPage
      currentPath="/contact"
      currentSection="brand"
      eyebrow="ارتباط با ما"
      title="با čārana در تماس باشید"
      description={`${company.brandFa} محصولی از ${company.legalName} است؛ شرکتی مستقر در تورنتو که روی ساخت زیرساخت‌های دیجیتال کسب‌وکارها کار می‌کند.`}
    >
      <section className="contact-layout">
        <Card className="contact-card">
          <CardContent>
            <strong>ایمیل</strong>
            <ul className="plain-list">
              <li>
                عمومی:{" "}
                <a href={`mailto:${company.email.general}`}>{company.email.general}</a>
              </li>
              <li>
                پشتیبانی:{" "}
                <a href={`mailto:${company.email.support}`}>{company.email.support}</a>
              </li>
              <li>
                همکاری و تبلیغات:{" "}
                <a href={`mailto:${company.email.partners}`}>{company.email.partners}</a>
              </li>
              <li>
                حریم خصوصی:{" "}
                <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="contact-card">
          <CardContent>
            <strong>شرکت</strong>
            <ul className="plain-list">
              <li>{company.legalName}</li>
              <li>{company.address}</li>
              <li>
                <a href={company.parentSite} target="_blank" rel="noopener noreferrer">
                  ashavid.ca
                </a>
              </li>
            </ul>

            <strong style={{ display: "block", marginTop: "1rem" }}>شبکه‌های اجتماعی</strong>
            <ul className="plain-list">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="contact-form-section">
        <h2>پیام بفرستید</h2>
        <ContactForm />
      </section>

      <section className="note-card">
        <h2>دنبال چه چیزی هستید؟</h2>
        <ul className="plain-list">
          <li>
            مشکل فنی یا سؤال درباره‌ی حساب کاربری →{" "}
            <Link href="/support">صفحه‌ی پشتیبانی</Link>
          </li>
          <li>
            کسب‌وکارتان در سایت هست و می‌خواهید در اختیارش بگیرید یا حذفش کنید →{" "}
            <a href={`mailto:${company.email.support}`}>{company.email.support}</a>
          </li>
          <li>
            ثبت کسب‌وکار جدید →{" "}
            <Link href="/dashboard/business/new">فرم ثبت</Link>
          </li>
          <li>
            حذف حساب کاربری →{" "}
            <Link href="/account/delete">صفحه‌ی حذف حساب</Link>
          </li>
        </ul>
      </section>
    </InnerPage>
  );
}

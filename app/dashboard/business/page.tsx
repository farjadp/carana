// ============================================================================
// Source: app/dashboard/business/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Sketch the future business-owner dashboard surface and responsibilities.
// Env / Identity: Static business panel scaffold for later Supabase-backed data.
// ============================================================================
import type { Metadata } from "next";

import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "پنل صاحب کسب‌وکار | čārana",
};

export default function BusinessDashboardPage() {
  return (
    <PageShell currentPath="/dashboard/business" currentSection="business">
      <main className="page-main">
        <section className="page-hero">
          <p className="eyebrow">پنل صاحب کسب‌وکار</p>
          <h1>جایی که صاحب بیزینس پروفایل، لیدها و وضعیت تایید را مدیریت می‌کند</h1>
          <p>
            این صفحه فعلاً اسکلت معماری است. در نسخه بعد به داده واقعی Supabase و sessionهای
            کاربر وصل می‌شود.
          </p>
        </section>

        <section className="info-grid">
          {[
            ["اطلاعات اصلی کسب‌وکار", "نام برند، توضیح، دسته‌بندی، شهر، آدرس، ساعات کاری و اطلاعات تماس."],
            ["اعتبار و تایید", "وضعیت claim، مدارک بررسی، و تاریخچه تایید یا نیاز به اصلاح."],
            ["مدیریت لید و پیام", "درخواست‌های دریافتی، کلیک‌ها، و تعامل‌های کاربر با پروفایل."],
          ].map(([title, description]) => (
            <Card key={title} className="info-card">
              <CardContent>
                <strong>{title}</strong>
                <p>{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </PageShell>
  );
}

// ============================================================================
// Source: app/how-it-works/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Explain the discovery and conversion flow for directory users.
// Env / Identity: Static product-explainer page for čārana.
// ============================================================================
import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "چطور کار می‌کند | čārana",
};

export default function HowItWorksPage() {
  return (
    <InnerPage
      currentPath="/how-it-works"
      currentSection="business"
      eyebrow="جریان محصول"
      title="تجربه باید ساده باشد: جست‌وجو کن، کسب‌وکار را پیدا کن، ارزیابی کن، تماس بگیر"
      description="در čārana کاربر نباید در پیچیدگی گم شود. منطق کلی محصول باید به اندازه کافی روشن باشد که هم کسی که دنبال سرویس است و هم صاحب کسب‌وکاری که می‌خواهد دیده شود، سریع از آن استفاده کند."
    >
      <section className="process-steps">
        {[
          ["۱", "نیازت را مشخص می‌کنی", "از دسته‌ها یا جست‌وجوی مستقیم، کاربر وارد مسیر خدمات پزشکی، حقوقی، مالی، غذایی یا سایر حوزه‌ها می‌شود."],
          ["۲", "شهر و محدوده را فیلتر می‌کنی", "شهر و محله از همان ابتدا مهم‌اند، چون انتخاب بیزینس محلی بدون context کامل نیست."],
          ["۳", "پروفایل‌ها را مقایسه می‌کنی", "توضیح خدمات، محدوده سرویس، اعتبار، امتیاز و اطلاعات تماس باید سریع قابل‌فهم باشند."],
          ["۴", "تماس یا ثبت کسب‌وکار انجام می‌شود", "کاربر یا با بیزینس تماس می‌گیرد یا برند خودش را با حداقل اصطکاک در دایرکتوری ثبت می‌کند."],
        ].map(([step, title, description]) => (
          <Card key={step} className="step-card">
            <CardContent>
              <span>{step}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="info-grid">
        {[
          ["برای کاربری که دنبال سرویس است", "جست‌وجوی سریع، فیلترهای معنادار، محتوای فارسی و نشانه‌های اعتماد اهمیت دارند."],
          ["برای صاحب کسب‌وکار", "ثبت ساده، دیده‌شدن محلی، معرفی حرفه‌ای و امکان ساخت اعتبار به مرور زمان حیاتی است."],
          ["برای فازهای بعد", "ریویو، ذخیره کسب‌وکار، badgeهای اعتبار و انتشار همزمان در وب و موبایل مسیر منطقی رشد هستند."],
        ].map(([title, description]) => (
          <Card key={title} className="info-card">
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </InnerPage>
  );
}

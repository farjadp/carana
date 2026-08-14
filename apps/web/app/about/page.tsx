// ============================================================================
// Source: app/about/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Present the brand mission, positioning, and placeholder founder content.
// Env / Identity: Static brand page for čārana.
// ============================================================================
import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "درباره ما",
};

export default function AboutPage() {
  return (
    <InnerPage
      currentPath="/about"
      currentSection="brand"
      eyebrow="درباره ما"
      title="čārana برای ساختن مرجع معرفی کسب‌وکارهای ایرانیان کانادا شکل می‌گیرد"
      description="مسئله این پروژه صرفاً ساختن یک وب‌سایت نیست. مسئله اصلی این است که هزاران کسب‌وکار ایرانی در کانادا دیده نمی‌شوند چون مرجع متمرکز، حرفه‌ای و فارسی‌زبان برای معرفی آن‌ها وجود ندارد."
    >
      <section className="info-grid">
        {[
          ["ماموریت اولیه", "ساده‌تر کردن کشف، مقایسه و ارتباط با کسب‌وکارهای ایرانی برای فارسی‌زبان‌های ساکن کانادا."],
          ["چشم‌انداز", "تبدیل شدن به مرجع اصلی معرفی بیزینس‌های ایرانی در شهرهای مختلف کانادا، روی وب و موبایل."],
          ["اصل طراحی", "فارسی‌محور، شفاف، کم‌اصطکاک، و دور از ظاهر شلوغ و generic که اعتماد را پایین می‌آورد."],
        ].map(([title, description]) => (
          <Card key={title} className="info-card">
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="note-card">
        <p className="eyebrow">این بخش منتظر دیتای توست</p>
        <h2>برای نهایی‌کردن صفحه «درباره ما»، این داده‌ها را از تو لازم دارم</h2>
        <ul className="plain-list">
          <li>داستان شروع پروژه: چرا می‌خواهی دایرکتوری بیزینس‌های ایرانی را بسازی و این خلأ را کجا دیده‌ای.</li>
          <li>تیم یا بنیان‌گذار: اسم، نقش، و اینکه می‌خواهی شخصی معرفی شوی یا برند-محور بمانی.</li>
          <li>شهر یا شهرهای اولویت‌دار: مثلاً تورنتو، ونکوور، مونترال یا کل کانادا.</li>
          <li>ارزش‌های برند: مثلاً اعتماد، دیده‌شدن عادلانه، جامعه‌محوری و کیفیت معرفی کسب‌وکارها.</li>
          <li>اگر جمله یا tagline نهایی داری، همان را اینجا می‌نشانیم.</li>
        </ul>
      </section>
    </InnerPage>
  );
}

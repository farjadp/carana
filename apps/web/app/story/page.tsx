// ============================================================================
// Source: app/story/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Explain the linguistic and brand meaning behind the name čārana.
// Env / Identity: Static brand-story page for čārana.
// ============================================================================
import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "داستان اسم | čārana",
};

export default function StoryPage() {
  return (
    <InnerPage
      currentPath="/story"
      currentSection="brand"
      eyebrow="ریشه نام"
      title="čārana فقط یک اسم نیست؛ بیانیه هویت برند است"
      description="این اسم از بازسازی‌های زبان‌شناختی ایرانی باستان الهام می‌گیرد و به مفهومی نزدیک به «جای دادوستد» یا «محل گردش برای معامله» اشاره دارد. در این نسخه، این معنا به شکل یک مرجع زنده برای معرفی و گردش کسب‌وکارها بازخوانی می‌شود."
    >
      <section className="story-panel">
        <h2>چرا این اسم کار می‌کند</h2>
        <p>
          <span dir="ltr">čārana</span> هم ریشه‌دار است، هم متفاوت. برای دایرکتوری‌ای که قرار
          است هزاران کسب‌وکار ایرانی را زیر یک هویت جمع کند، این اسم هم حس فرهنگی ایجاد
          می‌کند، هم مدرن و متمایز می‌ماند.
        </p>
        <div className="pronunciation">
          <span>تلفظ:</span>
          <strong>چا-را-نا</strong>
          <small dir="ltr">/t͡ʃaː.ra.na/</small>
        </div>
      </section>

      <section className="info-grid">
        {[
          ["ریشه معنایی", "برداشت ساده: جایی برای معرفی، کشف و وصل شدن آدم‌ها به کسب‌وکارهای واقعی."],
          ["اثر برندینگ", "اسم به اندازه کافی خاص است که در ذهن بماند، اما به‌قدری غریب نیست که کاربر فارسی‌زبان با آن بیگانه شود."],
          ["کاربرد در هویت بصری", "حرف č می‌تواند به تنهایی به یک monogram قوی برای اپ، favicon و badgeهای محصول تبدیل شود."],
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

// ============================================================================
// Source: app/provinces/page.tsx
// Version: 1.0.0 — 2026-08-23
// Why: Top of the geography hierarchy — province first, then city.
// Env / Identity: Public read through the request-scoped client.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import { listProvinces } from "@/lib/data/geography";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/provinces" },
  title: "استان‌ها | کسب‌وکارهای ایرانی کانادا",
  description:
    "کسب‌وکارهای ایرانی کانادا را بر اساس استان مرور کنید: انتاریو، بریتیش کلمبیا، کبک و بقیه.",
};

export default async function ProvincesPage() {
  const provinces = await listProvinces();
  const total = provinces.reduce((sum, p) => sum + p.total, 0);

  return (
    <InnerPage
      currentPath="/provinces"
      currentSection="business"
      eyebrow="جغرافیا"
      title="کسب‌وکارها بر اساس استان"
      description={`${total.toLocaleString("fa-IR")} کسب‌وکار ثبت‌شده در ${provinces.length} استان کانادا. استان را انتخاب کنید تا شهرهای آن را ببینید.`}
    >
      <section className="province-grid">
        {provinces.map(({ province, total: count, cities }) => (
          <Link
            key={province.slug}
            href={`/provinces/${province.slug}`}
            className="province-card"
          >
            <div className="province-card-head">
              <span className="province-count">{count.toLocaleString("fa-IR")}</span>
              <div>
                <strong>{province.name}</strong>
                <span className="province-en">{province.nameEn}</span>
              </div>
            </div>

            {cities.length > 0 ? (
              <p className="province-cities">
                {cities.slice(0, 5).map((c) => c.city).join(" · ")}
                {cities.length > 5 ? ` و ${cities.length - 5} شهر دیگر` : ""}
              </p>
            ) : (
              <p className="province-cities">شهرها هنوز مشخص نشده‌اند</p>
            )}
          </Link>
        ))}
      </section>
    </InnerPage>
  );
}

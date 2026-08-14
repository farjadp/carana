// ============================================================================
// Source: app/cities/page.tsx
// Version: 2.0.0 — 2026-08-23
// Why: Index of cities, grouped under their province so the hierarchy reads
//      province → city. Counts come from live data rather than a static list,
//      so a city appears as soon as a listing lands in it.
// Env / Identity: Public read through the request-scoped client.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { PROVINCES } from "@charana/core";
import { InnerPage } from "@/components/inner-page";
import { listCitiesWithCounts } from "@/lib/data/geography";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "شهرها",
  description: "کسب‌وکارهای ایرانیان کانادا بر اساس استان و شهر.",
};

export default async function CitiesPage() {
  const cities = await listCitiesWithCounts();

  const grouped = PROVINCES.map((province) => ({
    province,
    cities: cities.filter((c) => c.province?.slug === province.slug),
  })).filter((g) => g.cities.length > 0);

  const orphans = cities.filter((c) => !c.province);
  const total = cities.reduce((s, c) => s + c.count, 0);

  return (
    <InnerPage
      currentPath="/cities"
      currentSection="business"
      eyebrow="جستجو بر اساس موقعیت"
      title="شهرهای فعال در čārana"
      description={`${total.toLocaleString("fa-IR")} کسب‌وکار در ${cities.length} شهر. شهرها زیر استان خودشان گروه‌بندی شده‌اند.`}
    >
      <nav className="crumbs">
        <Link href="/provinces">مرور بر اساس استان</Link>
      </nav>

      {grouped.map(({ province, cities: list }) => (
        <section key={province.slug} className="city-group">
          <div className="city-group-head">
            <Link href={`/provinces/${province.slug}`} className="city-group-link">
              همه‌ی {province.name}
            </Link>
            <h2>
              <MapPin size={18} />
              {province.name}
            </h2>
          </div>

          <div className="city-chip-row">
            {list.map((c) => (
              <Link
                key={c.city}
                href={`/cities/${encodeURIComponent(c.city)}`}
                className="city-chip"
              >
                {c.city}
                <span>{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {orphans.length > 0 ? (
        <section className="city-group">
          <div className="city-group-head">
            <h2>سایر</h2>
          </div>
          <div className="city-chip-row">
            {orphans.map((c) => (
              <Link
                key={c.city}
                href={`/cities/${encodeURIComponent(c.city)}`}
                className="city-chip"
              >
                {c.city}
                <span>{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </InnerPage>
  );
}

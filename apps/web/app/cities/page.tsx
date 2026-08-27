// ============================================================================
// Source: app/cities/page.tsx
// Version: 3.0.0 — 2026-08-16
// Why: Index of cities. v3 is the redesign: the eight cities with photography
//      lead as tiles (name, Persian name, live count), then every other city
//      in the data grouped under its province as chips with Persian names from
//      `city_aliases`. Links go to slugs the city route actually resolves
//      (`/cities/richmond-hill`), which v2 did not — it linked raw names and
//      404'd for anything outside the eight configs.
// Env / Identity: Public read through the request-scoped client.
// ============================================================================
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { PROVINCES } from "@goplaza/core";
import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { cityConfigs, citySlug, findCityConfig } from "@/lib/data/cities";
import { listCitiesWithCounts } from "@/lib/data/geography";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { faNumber as fa } from "@goplaza/core";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "شهرها | کسب‌وکارهای ایرانی کانادا",
  description: "کسب‌وکارهای ایرانیان کانادا بر اساس شهر و استان — تورنتو، ونکوور، مونترال، کلگری، اتاوا و ده‌ها شهر دیگر با شمارش زنده.",
  alternates: { canonical: "/cities" },
};


export default async function CitiesPage() {
  const supabase = await createSupabaseServerClient();
  const [cities, { data: aliasRows }] = await Promise.all([
    listCitiesWithCounts(),
    supabase.from("city_aliases").select("city_en, aliases"),
  ]);
  const faName = new Map<string, string>();
  for (const r of (aliasRows ?? []) as { city_en: string; aliases: string }[]) {
    const words = r.city_en.trim().split(/\s+/).length;
    faName.set(r.city_en.toLowerCase(), r.aliases.split(/\s+/).slice(0, words).join(" "));
  }
  const nameFaOf = (en: string) => findCityConfig(en)?.nameFa ?? faName.get(en.toLowerCase()) ?? null;
  const hrefOf = (en: string) => `/cities/${findCityConfig(en)?.slug ?? citySlug(en)}`;

  // Featured: the eight configured cities, with the count of the metro
  // (city + its neighbourhoods) so Toronto says 250, not 41.
  // Whole-name match: "Richmond" (Vancouver) must not swallow "Richmond Hill" (Toronto).
  const countFor = (terms: string[]) => {
    const set = new Set(terms.map((t) => t.toLowerCase()));
    return cities.filter((c) => set.has(c.city.trim().toLowerCase())).reduce((s, c) => s + c.count, 0);
  };
  const featured = cityConfigs
    .map((cfg) => ({ cfg, count: countFor([cfg.nameEn, ...cfg.neighborhoods]) }))
    .sort((a, b) => b.count - a.count);

  const grouped = PROVINCES.map((province) => ({
    province,
    cities: cities.filter((c) => c.province?.slug === province.slug),
  })).filter((g) => g.cities.length > 0);
  const orphans = cities.filter((c) => !c.province);
  const total = cities.reduce((s, c) => s + c.count, 0);

  return (
    <PageShell currentPath="/cities" currentSection="business">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "شهرها", url: "/cities" }])} />
      <main className="min-h-screen bg-[color:var(--bg)]">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-6 md:pt-14">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">جستجو بر اساس موقعیت</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">
              شهر تو کجاست؟
            </h1>
            <p className="max-w-xl text-sm leading-7 text-[color:var(--muted-text)] md:text-base">
              {fa(total)} کسب‌وکار ایرانی در {fa(cities.length)} شهر کانادا. عددها زنده‌اند — با هر ثبت جدید تغییر می‌کنند.
              <Link href="/provinces" className="mr-2 font-bold text-[color:var(--lajvard)]">مرور بر اساس استان ←</Link>
            </p>
          </div>
        </section>

        {/* Featured city tiles */}
        <section className="mx-auto max-w-7xl px-4 pb-4" aria-labelledby="featured-h">
          <h2 id="featured-h" className="sr-only">شهرهای اصلی</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map(({ cfg, count }, i) => (
              <Link
                key={cfg.slug}
                href={`/cities/${cfg.slug}`}
                className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"}`}
              >
                <Image
                  src={`/images/cities/${cfg.slug}.webp`}
                  alt=""
                  fill
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
                  className="object-cover transition duration-700 group-hover:scale-105"
                  priority={i < 3}
                />
                {/* Light wash + bottom anchor only; the photographs are already night scenes. */}
                <div className="absolute inset-0 bg-[#14213d]/15" />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#14213d]/90 via-[#14213d]/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 md:p-5">
                  <div>
                    <p className={`font-black text-[#f6f1e8] drop-shadow-sm ${i === 0 ? "text-3xl md:text-4xl" : "text-lg md:text-xl"}`}>{cfg.nameFa}</p>
                    <p className="text-xs text-[#f6f1e8]/70" dir="ltr">{cfg.nameEn}, {cfg.province}</p>
                  </div>
                  <span className="rounded-full bg-[#f6f1e8]/15 px-3 py-1 text-xs font-bold text-[#f6f1e8] backdrop-blur">
                    {count ? `${fa(count)} کسب‌وکار` : "هنوز کسب‌وکاری ثبت نشده"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Every city, by province */}
        <section className="mx-auto max-w-7xl px-4 py-10" aria-labelledby="all-h">
          <div className="mb-6 flex items-end justify-between">
            <h2 id="all-h" className="text-2xl font-black text-[color:var(--text)]">همه‌ی شهرها</h2>
            <p className="text-xs text-[color:var(--muted-text)]">به ترتیب تعداد کسب‌وکار</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {grouped.map(({ province, cities: list }) => (
              <section key={province.slug} className="rounded-3xl border border-[color:var(--line)] bg-white p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-black text-[color:var(--text)]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--lajvard)]/8 text-[color:var(--lajvard)]"><MapPin size={17} /></span>
                    {province.name}
                    <span className="text-xs font-bold text-[color:var(--muted-text)]">· {fa(list.reduce((s, c) => s + c.count, 0))}</span>
                  </h3>
                  <Link href={`/provinces/${province.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">
                    همه‌ی {province.name} <ArrowLeft size={13} />
                  </Link>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {list.map((c) => {
                    const faN = nameFaOf(c.city);
                    return (
                      <li key={c.city}>
                        <Link
                          href={hrefOf(c.city)}
                          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--bg)] px-3.5 py-2 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)]/40 hover:bg-white hover:shadow-[0_8px_20px_rgba(20,33,61,0.08)]"
                        >
                          {faN ? <span>{faN}</span> : null}
                          <span dir="ltr" className={faN ? "text-xs font-semibold text-[color:var(--muted-text)]" : ""}>{c.city}</span>
                          <span className="rounded-full bg-[color:var(--lajvard)]/8 px-2 py-0.5 text-[11px] font-black text-[color:var(--lajvard)]">{fa(c.count)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {orphans.length > 0 ? (
              <section className="rounded-3xl border border-dashed border-[color:var(--line)] p-5 md:p-6">
                <h3 className="mb-4 text-lg font-black text-[color:var(--text)]">بدون استان مشخص</h3>
                <ul className="flex flex-wrap gap-2">
                  {orphans.map((c) => (
                    <li key={c.city}>
                      <Link href={hrefOf(c.city)} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3.5 py-2 text-sm font-bold text-[color:var(--text)]">
                        <span dir="ltr">{c.city}</span>
                        <span className="text-[11px] text-[color:var(--muted-text)]">{fa(c.count)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="mt-10 rounded-3xl bg-[color:var(--lajvard)] p-6 text-white md:flex md:items-center md:justify-between md:p-8">
            <div>
              <h2 className="text-xl font-black">شهرت این‌جا نیست؟</h2>
              <p className="mt-1 text-sm text-white/80">اولین کسب‌وکار ایرانی شهرت را ثبت کن؛ صفحه‌ی شهر خودبه‌خود ساخته می‌شود.</p>
            </div>
            <Link href="/dashboard/business/new" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 font-bold text-[color:var(--lajvard)] md:mt-0">
              ثبت رایگان <ArrowLeft size={16} />
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

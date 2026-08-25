// ============================================================================
// Source: app/cities/[slug]/[category]/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The city × category page — "دندان‌پزشک ایرانی در تورنتو". This is the
//      SEO/GEO workhorse: a real, live list with numbers a search engine or an
//      LLM can quote (count, verified, open now, last updated), FAQ that
//      answers the questions people actually type, and structured data for
//      all of it. Everything is derived from the directory; nothing is claimed.
//      Below MIN_INDEXABLE listings the page renders with a "be the first"
//      call and `noindex`, so thin combinations never dilute the index.
// Env / Identity: Public. Anon client. Revalidates hourly.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, MapPin, Sparkles } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { BusinessCard } from "@/components/business/business-card";
import { JsonLd } from "@/components/json-ld";
import { SuggestionBox } from "@/components/suggestion-box";
import { cityConfigs } from "@/lib/data/cities";
import { CATEGORY_DETAILS, getCategoryDetail } from "@/lib/data/category-details";
import { brand } from "@goplaza/core";
import { cityCategoryDescription, cityCategoryTitle } from "@/lib/seo/titles";
import {
  MIN_INDEXABLE,
  breadcrumbLd,
  countCategoryCities,
  countCityCategories,
  faqLd,
  fetchLocalBusinesses,
  itemListLd,
  localFaqs,
  localHeadline,
  localIntro,
  resolveCity,
  summarise,
} from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string; category: string }>; searchParams?: Promise<{ page?: string }> };
const PAGE = 24;

const fa = (n: number) => n.toLocaleString("fa-IR");

export function generateStaticParams() {
  return cityConfigs.flatMap((c) => Object.keys(CATEGORY_DETAILS).map((category) => ({ slug: c.slug, category })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, category } = await params;
  const supabase = await createSupabaseServerClient();
  const city = await resolveCity(supabase, slug);
  if (!city || !CATEGORY_DETAILS[category]) notFound();
  const cat = getCategoryDetail(category);
  const rows = await fetchLocalBusinesses(supabase, city, category, cat.name);
  const s = summarise(rows);
  const h1 = localHeadline(city.nameFa, cat.name);
  const path = `/cities/${city.slug}/${category}`;
  return {
    // Title carries the word people type («پزشک»), not the config's display
    // label («پزشکی، دندانپزشکی و سلامت»), plus the real count.
    title: {
      absolute: s.total
        ? cityCategoryTitle({ categorySlug: category, categoryName: cat.name, cityFa: city.nameFa, count: s.total })
        : `${h1} | ${brand.nameFa}`,
    },
    description: s.total
      ? cityCategoryDescription({
          categorySlug: category,
          categoryName: cat.name,
          cityFa: city.nameFa,
          count: s.total,
          // Counted, never asserted. The old copy always appended
          // "{n} تأییدشده" — and only 3 rows in the entire database have
          // verified_at, so it read "۰ تأییدشده" almost everywhere.
          withPhone: rows.filter((r) => r.phone).length,
          withWebsite: s.withWebsite,
        })
      : `${h1} — به‌زودی. ثبت رایگان کسب‌وکار در گوپلازا.`,
    alternates: { canonical: path },
    robots: s.total >= MIN_INDEXABLE ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { locale: "fa_CA", title: h1, description: cat.description, url: path, images: cat.imageUrl ? [{ url: cat.imageUrl }] : undefined },
  };
}

export default async function CityCategoryPage({ params, searchParams }: Params) {
  const { slug, category } = await params;
  const page = Math.max(1, parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const supabase = await createSupabaseServerClient();
  const city = await resolveCity(supabase, slug);
  if (!city || !CATEGORY_DETAILS[category]) notFound();
  const cat = getCategoryDetail(category);

  const allCategories = Object.values(CATEGORY_DETAILS).map((c) => ({ slug: c.slug, name: c.name }));
  const [rows, siblings, elsewhere] = await Promise.all([
    fetchLocalBusinesses(supabase, city, category, cat.name),
    countCityCategories(supabase, city, allCategories),
    countCategoryCities(supabase, category, cat.name),
  ]);
  const s = summarise(rows);
  const updated = new Date();
  const h1 = localHeadline(city.nameFa, cat.name);
  const path = `/cities/${city.slug}/${category}`;
  const faqs = localFaqs(city, cat.name, s);
  const otherHere = siblings.filter((c) => c.slug !== category && c.count > 0).slice(0, 8);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE);
  const sameElsewhere = elsewhere.filter((e) => e.city.slug !== city.slug && e.count > 0).slice(0, 8);

  return (
    <PageShell currentPath={path} currentSection="business">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "خانه", url: "/" },
            { name: "شهرها", url: "/cities" },
            { name: city.nameFa, url: `/cities/${city.slug}` },
            { name: h1, url: path },
          ]),
          itemListLd(h1, path, rows),
          faqLd(faqs),
        ]}
      />

      <main className="min-h-screen bg-[color:var(--bg)]">
        {/* Hero — photograph of the category, numbers over it */}
        <section className="relative overflow-hidden text-[#f6f1e8]">
          <div className="absolute inset-0 bg-[#14213d]" />
          {cat.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cat.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14213d] via-[#14213d]/70 to-[#14213d]/30" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-white/60" aria-label="مسیر">
              <Link href="/" className="hover:text-white">خانه</Link><span>/</span>
              <Link href="/cities" className="hover:text-white">شهرها</Link><span>/</span>
              <Link href={`/cities/${city.slug}`} className="hover:text-white">{city.nameFa}</Link><span>/</span>
              <span className="text-white">{cat.name}</span>
            </nav>
            <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_380px]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold">
                  <MapPin className="h-4 w-4 text-emerald-300" /> {city.nameEn}, {city.province}
                </div>
                <h1 className="mb-4 text-3xl font-black leading-tight md:text-5xl">{h1}</h1>
                <p className="max-w-3xl leading-8 text-white/80">{localIntro(city, cat.name, s, updated)}</p>
              </div>
              {/* At a glance — the block LLMs quote */}
              <dl className="grid grid-cols-3 gap-3" aria-label="در یک نگاه">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <dd className="block text-2xl font-black">{fa(s.total)}</dd><dt className="text-xs text-white/60">کسب‌وکار</dt>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <dd className="block text-2xl font-black">{fa(s.verified)}</dd><dt className="text-xs text-white/60">تأییدشده</dt>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center">
                  <dd className="block text-2xl font-black">{fa(s.openNow)}</dd><dt className="text-xs text-white/60">الان باز</dt>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              {rows.length ? (
                <>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-xl font-black text-[color:var(--text)]">فهرست {h1}</h2>
                    <p className="text-xs text-[color:var(--muted-text)]">تأییدشده‌ها اول · به‌روزرسانی {updated.toLocaleDateString("fa-IR")}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {pageRows.map((b) => (
                      <BusinessCard key={b.id} business={b as never} categoryLabel={cat.name} />
                    ))}
                  </div>
                  {totalPages > 1 ? (
                    <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="صفحه‌بندی">
                      {page > 1 ? <Link href={`${path}?page=${page - 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">قبلی</Link> : null}
                      <span className="text-[color:var(--muted-text)]">صفحه‌ی {fa(page)} از {fa(totalPages)}</span>
                      {page < totalPages ? <Link href={`${path}?page=${page + 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">بعدی</Link> : null}
                    </nav>
                  ) : null}
                </>
              ) : (
                <div className="rounded-3xl border border-[color:var(--line)] bg-white p-10 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-[color:var(--gold)]" />
                  <h2 className="text-xl font-black text-[color:var(--text)]">اولین باش</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[color:var(--muted-text)]">
                    هنوز {h1.replace(` در ${city.nameFa}`, "")} در {city.nameFa} ثبت نشده. اگر مال توست یا می‌شناسی، ثبت رایگان است.
                  </p>
                  <Link href="/dashboard/business/new" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-6 font-bold text-[#f6f1e8]">
                    ثبت کسب‌وکار <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* FAQ — rendered, and mirrored in FAQPage JSON-LD */}
              <section className="mt-12" aria-labelledby="faq-h">
                <h2 id="faq-h" className="mb-4 text-xl font-black text-[color:var(--text)]">پرسش‌های رایج</h2>
                <div className="divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-white">
                  {faqs.map((f) => (
                    <details key={f.q} className="group px-5">
                      <summary className="cursor-pointer list-none py-4 font-bold text-[color:var(--text)] marker:content-none">{f.q}</summary>
                      <p className="-mt-1 pb-5 text-sm leading-8 text-[color:var(--text)]/80">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>

              {rows.length < 6 ? (
                <div className="mt-10">
                  <SuggestionBox
                    page={path}
                    compact
                    title={`${h1.replace(` در ${city.nameFa}`, "")} خوبی در ${city.nameFa} می‌شناسی؟`}
                    hint="اسمش را بگو یا بنویس؛ دعوتش می‌کنیم."
                  />
                </div>
              ) : null}
            </div>

            <aside className="space-y-5">
              {s.subCategories.length ? (
                <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                  <h2 className="mb-3 font-black text-[color:var(--text)]">زیرشاخه‌ها در {city.nameFa}</h2>
                  <ul className="space-y-2 text-sm">
                    {s.subCategories.map((sc) => (
                      <li key={sc.name} className="flex items-center justify-between">
                        <span className="text-[color:var(--text)]">{sc.name}</span>
                        <span className="text-xs text-[color:var(--muted-text)]">{fa(sc.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {otherHere.length ? (
                <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                  <h2 className="mb-3 font-black text-[color:var(--text)]">دیگر خدمات ایرانی در {city.nameFa}</h2>
                  <ul className="space-y-1.5 text-sm">
                    {otherHere.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/cities/${city.slug}/${c.slug}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[color:var(--bg)]">
                          <span className="text-[color:var(--text)]">{c.name}</span>
                          <span className="text-xs text-[color:var(--muted-text)]">{fa(c.count)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {sameElsewhere.length ? (
                <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                  <h2 className="mb-3 font-black text-[color:var(--text)]">{cat.name} در شهرهای دیگر</h2>
                  <ul className="space-y-1.5 text-sm">
                    {sameElsewhere.map((e) => (
                      <li key={e.city.slug}>
                        <Link href={`/cities/${e.city.slug}/${category}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[color:var(--bg)]">
                          <span className="text-[color:var(--text)]">{e.city.nameFa}</span>
                          <span className="text-xs text-[color:var(--muted-text)]">{fa(e.count)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-2xl bg-[color:var(--lajvard)] p-5 text-white">
                <div className="mb-2 flex items-center gap-2 font-black"><BadgeCheck className="h-5 w-5" /> نشان تأیید</div>
                <p className="text-sm leading-7 text-white/85">صاحب کسب‌وکار شماره یا ایمیلش را با کد اثبات کرده. شش ماه اعتبار دارد و با تغییر شماره خودبه‌خود برداشته می‌شود.</p>
                <Link href="/trust" className="mt-3 inline-flex items-center gap-1 text-sm font-bold underline-offset-4 hover:underline">بیشتر <ArrowLeft className="h-3.5 w-3.5" /></Link>
              </div>

              <div className="flex items-center gap-2 text-xs text-[color:var(--muted-text)]">
                <Clock className="h-3.5 w-3.5" /> «الان باز» از ساعت کاری اعلام‌شده محاسبه می‌شود.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

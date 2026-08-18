// ============================================================================
// Source: app/jobs/page.tsx
// Version: 1.0.0 — 2026-08-18
// Why: The public hiring board. Design: docs/09-jobs-board.md.
// Env / Identity: Reads through the request-scoped (anon) client, so the RLS
//      policy — published, not closed, not expired, on a public listing — is
//      what decides visibility. The explicit filters below say the same thing
//      out loud; they are not the security boundary.
//
// City filtering is a query parameter, not /jobs/[city]: that route would
// collide with /jobs/[slug], and a slug that happens to look like a city
// would silently resolve to the wrong page. The design doc listed both.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";

import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS_FA,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  jobDaysRemaining,
  languageRequirementFa,
  type EmploymentType,
} from "@charana/core";

import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "فرصت‌های شغلی در کسب‌وکارهای ایرانی کانادا",
  description:
    "آگهی‌های استخدام کسب‌وکارهای ایرانی در کانادا — با فیلتر شهر، نوع همکاری و زبان لازم. جایی که فارسی‌دانستن یک مزیت است، نه یک توضیح اضافه.",
  alternates: { canonical: "/jobs" },
};

// Hiring ads change weekly, which is the whole point of the board; an hour of
// staleness is fine, a day is not.
export const revalidate = 900;

const fa = (n: number) => n.toLocaleString("fa-IR");

type Search = { city?: string; type?: string; lang?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { city, type, lang } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("job_posts")
    .select("id, slug, title, employment_type, workplace_type, city, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english, expires_at, published_at, business:businesses(id, name, slug, logo_url)")
    .eq("status", "published")
    .is("closed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  if (city) query = query.ilike("city", city);
  if (type && (EMPLOYMENT_TYPES as string[]).includes(type)) query = query.eq("employment_type", type);
  if (lang === "fa") query = query.eq("requires_persian", true);
  if (lang === "en") query = query.eq("requires_english", true);

  const { data: jobs } = await query;
  const rows = jobs ?? [];

  // Cities are derived from what is actually posted, not from the city table —
  // a filter chip for a city with no jobs would be a dead end.
  const cities = [...new Set(rows.map((j) => j.city).filter(Boolean) as string[])].sort();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      active
        ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
        : "border-[color:var(--line)] bg-white text-[color:var(--text)] hover:border-[color:var(--lajvard)]"
    }`;

  const withParam = (key: string, value: string | null) => {
    const params = new URLSearchParams();
    if (city && key !== "city") params.set("city", city);
    if (type && key !== "type") params.set("type", type);
    if (lang && key !== "lang") params.set("lang", lang);
    if (value) params.set(key, value);
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <PageShell currentPath="/jobs" currentSection="home">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "فرصت‌های شغلی", url: "/jobs" }])} />
      <main className="page-main">
        <section className="mb-8">
          <p className="eyebrow">استخدام</p>
          <h1>فرصت‌های شغلی</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--muted-text)]">
            آگهی‌های استخدام کسب‌وکارهای ایرانی در کانادا. هر آگهی را صاحب همان کسب‌وکار ثبت کرده و
            پس از تاریخ انقضا خودبه‌خود از این صفحه برداشته می‌شود.
          </p>
        </section>

        {/* Filters. Rendered only when there is something to filter. */}
        {rows.length > 0 || city || type || lang ? (
          <section className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link href={withParam("type", null)} className={chip(!type)}>همه انواع</Link>
              {EMPLOYMENT_TYPES.map((t) => (
                <Link key={t} href={withParam("type", t)} className={chip(type === t)}>
                  {EMPLOYMENT_TYPE_LABELS_FA[t]}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={withParam("lang", null)} className={chip(!lang)}>هر زبانی</Link>
              <Link href={withParam("lang", "fa")} className={chip(lang === "fa")}>فارسی لازم است</Link>
              <Link href={withParam("lang", "en")} className={chip(lang === "en")}>انگلیسی لازم است</Link>
            </div>
            {cities.length > 1 || city ? (
              <div className="flex flex-wrap gap-2">
                <Link href={withParam("city", null)} className={chip(!city)}>همه شهرها</Link>
                {cities.map((c) => (
                  <Link key={c} href={withParam("city", c)} className={chip(city?.toLowerCase() === c.toLowerCase())}>
                    {c}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-[color:var(--bg)] p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[color:var(--muted-text)] shadow-sm">
              <Briefcase size={26} />
            </div>
            <h2 className="mb-2 text-lg font-bold">
              {city || type || lang ? "با این فیلترها آگهی‌ای نیست." : "هنوز آگهی استخدامی ثبت نشده."}
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-[color:var(--muted-text)]">
              {city || type || lang
                ? "فیلترها را بردار تا همه آگهی‌ها را ببینی."
                : "اگر کسب‌وکاری در چارانا داری، ثبت آگهی استخدام رایگان است."}
            </p>
            <Link
              href={city || type || lang ? "/jobs" : "/dashboard/business"}
              className="inline-block rounded-lg border border-[color:var(--line)] bg-white px-6 py-2 text-sm font-medium transition hover:bg-gray-50"
            >
              {city || type || lang ? "همه آگهی‌ها" : "ثبت آگهی استخدام"}
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-[color:var(--muted-text)]">{fa(rows.length)} آگهی فعال</p>
            <ul className="space-y-3">
              {rows.map((j) => {
                const business = j.business as { name?: string; slug?: string } | null;
                const remaining = jobDaysRemaining(j);
                const language = languageRequirementFa(j);
                return (
                  <li key={j.id}>
                    <Link
                      href={`/jobs/${j.slug}`}
                      className="block rounded-2xl border border-[color:var(--line)] bg-white p-5 transition hover:border-[color:var(--lajvard)] hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-[color:var(--text)]">{j.title}</h2>
                          {business?.name ? (
                            <p className="mt-0.5 text-sm text-[color:var(--muted-text)]">{business.name}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-[color:var(--bg)] px-3 py-1 text-[11px] font-bold text-[color:var(--text)]">
                          {EMPLOYMENT_TYPE_LABELS_FA[j.employment_type as EmploymentType]}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted-text)]">
                        {j.city ? (
                          <span className="inline-flex items-center gap-1"><MapPin size={12} /> {j.city}</span>
                        ) : null}
                        <span>{WORKPLACE_TYPE_LABELS_FA[j.workplace_type as never]}</span>
                        <span>{formatSalaryFa(j)}</span>
                        {language ? <span>زبان: {language}</span> : null}
                        {remaining !== null && remaining <= 7 ? (
                          <span className="text-[color:var(--annabi)]">{fa(remaining)} روز تا پایان</span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </PageShell>
  );
}

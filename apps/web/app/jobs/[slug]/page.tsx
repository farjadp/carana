// ============================================================================
// Source: app/jobs/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-18
// Why: One hiring ad, and the `JobPosting` JSON-LD block that puts it inside
//      Google's jobs widget. That block is the largest free-traffic lever the
//      project has — none of the seven competing directories emits one — and
//      it is the actual argument for this feature, bigger than the page.
// Env / Identity: Anon client, so RLS decides visibility. A post that expired
//      an hour ago 404s here, because "live" is a comparison against now()
//      and not a status anybody has to remember to update.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarClock, Globe, MapPin } from "lucide-react";

import {
  EMPLOYMENT_TYPE_LABELS_FA,
  EMPLOYMENT_TYPE_SCHEMA,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  isJobLive,
  jobDaysRemaining,
  languageRequirementFa,
  type EmploymentType,
  type WorkplaceType,
} from "@charana/core";

import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { env } from "@/lib/env";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ApplyButton } from "./apply-button";

export const revalidate = 900;

const SELECT =
  "id, slug, title, description, employment_type, workplace_type, city, province, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english, apply_method, apply_value, status, closed_at, expires_at, published_at, created_at, business:businesses(id, name, name_en, slug, logo_url, city, province, address, is_address_public)";

type JobBusiness = {
  id: string;
  name: string;
  name_en: string | null;
  slug: string | null;
  logo_url: string | null;
  city: string | null;
  province: string | null;
  address: string | null;
  is_address_public: boolean | null;
};

async function loadJob(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("job_posts").select(SELECT).eq("slug", slug).maybeSingle();
  if (!data || !isJobLive(data)) return null;
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) return { title: "آگهی پیدا نشد" };
  const business = job.business as unknown as JobBusiness | null;
  return {
    title: `${job.title}${business?.name ? ` — ${business.name}` : ""}`,
    description: job.description.slice(0, 160),
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: { title: job.title, description: job.description.slice(0, 200), type: "article" },
  };
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) notFound();

  const business = job.business as unknown as JobBusiness | null;
  const remaining = jobDaysRemaining(job);
  const language = languageRequirementFa(job);
  const site = env.baseUrl;

  // Google requires validThrough and expects filled postings to disappear;
  // both are satisfied by the expiry rule rather than by anyone's diligence.
  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.published_at ?? job.created_at,
    validThrough: job.expires_at,
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.employment_type as EmploymentType],
    directApply: job.apply_method === "url" ? false : true,
    hiringOrganization: business
      ? {
          "@type": "Organization",
          name: business.name_en || business.name,
          sameAs: business.slug ? `${site}/businesses/${business.slug}` : undefined,
          logo: business.logo_url ?? undefined,
        }
      : undefined,
    jobLocation:
      job.workplace_type === "remote"
        ? undefined
        : {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              streetAddress:
                business?.is_address_public && business.address ? business.address : undefined,
              addressLocality: job.city ?? business?.city ?? undefined,
              addressRegion: job.province ?? business?.province ?? undefined,
              addressCountry: "CA",
            },
          },
    jobLocationType: job.workplace_type === "remote" ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements:
      job.workplace_type === "remote" ? { "@type": "Country", name: "Canada" } : undefined,
    // Emitted only when there is a real number behind it. A «توافقی» ad must
    // not carry an invented range into Google's index.
    baseSalary:
      job.salary_is_public && job.salary_min
        ? {
            "@type": "MonetaryAmount",
            currency: "CAD",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salary_min,
              maxValue: job.salary_max ?? undefined,
              unitText:
                job.salary_period === "hour" ? "HOUR" : job.salary_period === "month" ? "MONTH" : "YEAR",
            },
          }
        : undefined,
    inLanguage: job.requires_persian ? "fa" : undefined,
  };

  return (
    <PageShell currentPath={`/jobs/${job.slug}`} currentSection="home">
      <JsonLd
        data={[
          jobLd,
          breadcrumbLd([
            { name: "خانه", url: "/" },
            { name: "فرصت‌های شغلی", url: "/jobs" },
            { name: job.title, url: `/jobs/${job.slug}` },
          ]),
        ]}
      />
      <main className="page-main">
        <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]">
          <ArrowRight size={14} /> همه فرصت‌های شغلی
        </Link>

        <article className="rounded-3xl border border-[color:var(--line)] bg-white p-6 md:p-8">
          <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">{job.title}</h1>

          {business ? (
            <Link
              href={business.slug ? `/businesses/${business.slug}` : "#"}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--lajvard)]"
            >
              <Building2 size={14} /> {business.name}
            </Link>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[color:var(--bg)] px-3 py-1.5 text-xs font-bold text-[color:var(--text)]">
              {EMPLOYMENT_TYPE_LABELS_FA[job.employment_type as EmploymentType]}
            </span>
            <span className="rounded-full bg-[color:var(--bg)] px-3 py-1.5 text-xs text-[color:var(--text)]">
              {WORKPLACE_TYPE_LABELS_FA[job.workplace_type as WorkplaceType]}
            </span>
            {job.city ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--bg)] px-3 py-1.5 text-xs text-[color:var(--text)]">
                <MapPin size={12} /> {job.city}
              </span>
            ) : null}
            <span className="rounded-full bg-[color:var(--bg)] px-3 py-1.5 text-xs text-[color:var(--text)]">
              {formatSalaryFa(job)}
            </span>
            {language ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)]/12 px-3 py-1.5 text-xs text-[color:var(--text)]">
                <Globe size={12} /> زبان لازم: {language}
              </span>
            ) : null}
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-loose text-[color:var(--text)]">
            {job.description}
          </div>

          <div className="mt-8 border-t border-[color:var(--line)] pt-6">
            <ApplyButton
              businessId={business?.id ?? ""}
              method={job.apply_method as "email" | "phone" | "url"}
              value={job.apply_value}
            />
            <p className="mt-3 text-xs text-[color:var(--muted-text)]">
              درخواست مستقیم به همین کسب‌وکار می‌رود؛ چارانا در استخدام واسطه نیست و رزومه‌ای دریافت نمی‌کند.
            </p>
          </div>

          {remaining !== null ? (
            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[color:var(--muted-text)]">
              <CalendarClock size={12} />
              {remaining <= 0
                ? "این آگهی به پایان رسیده است."
                : `${remaining.toLocaleString("fa-IR")} روز دیگر این آگهی خودبه‌خود برداشته می‌شود.`}
            </p>
          ) : null}
        </article>
      </main>
    </PageShell>
  );
}

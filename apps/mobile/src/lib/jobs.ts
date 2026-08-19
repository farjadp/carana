// ============================================================================
// Source: apps/mobile/src/lib/jobs.ts
// Version: 1.0.0 — 2026-08-18
// Why: Mobile read side for the jobs board the web shipped earlier today.
//
//      Read-only by design, like announcements: posting an ad is an owner
//      control, and mobile has no owner controls at all yet. A "post a job"
//      button here would be a promise the app cannot keep.
//
//      Liveness is filtered in the query — published, not closed, expires_at
//      in the future — so an expired ad is not returned at all rather than
//      returned and hidden. Exactly what the web does, and it has to be
//      exactly that, or the two surfaces disagree about what is live.
//      `isJobLive` from @goplaza/core is the same rule, and is used on the
//      row that comes back so a stale response cannot render as current.
// Env / Identity: Anon client. RLS already restricts these rows to live posts
//      on APPROVED/PUBLISHED businesses; the filters here say it out loud.
// ============================================================================
import type { EmploymentType, SalaryPeriod, WorkplaceType } from "@goplaza/core";

import { supabase } from "./supabase";

export type JobBusiness = {
  id: string;
  slug: string | null;
  name: string;
  logo_url: string | null;
};

export type JobPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  city: string | null;
  province: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod | null;
  salary_is_public: boolean;
  requires_persian: boolean;
  requires_english: boolean;
  apply_method: "email" | "phone" | "url";
  apply_value: string;
  status: string;
  closed_at: string | null;
  expires_at: string;
  published_at: string | null;
  business: JobBusiness | null;
};

const COLUMNS =
  "id, slug, title, description, employment_type, workplace_type, city, province, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english, apply_method, apply_value, status, closed_at, expires_at, published_at, business:businesses(id, slug, name, logo_url)";

/** The one liveness filter, applied to every query in this file. */
function liveQuery() {
  return supabase
    .from("job_posts")
    .select(COLUMNS)
    .eq("status", "published")
    .is("closed_at", null)
    .gt("expires_at", new Date().toISOString());
}

export type JobFilters = {
  city?: string | null;
  employmentType?: EmploymentType | null;
  /** "fa" | "en" — the language the job actually requires. */
  language?: "fa" | "en" | null;
};

/** The board. */
export async function listJobs(filters: JobFilters = {}, limit = 60): Promise<JobPost[]> {
  let query = liveQuery().order("published_at", { ascending: false }).limit(limit);
  if (filters.city) query = query.ilike("city", filters.city);
  if (filters.employmentType) query = query.eq("employment_type", filters.employmentType);
  if (filters.language === "fa") query = query.eq("requires_persian", true);
  if (filters.language === "en") query = query.eq("requires_english", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JobPost[];
}

/** One ad. Returns null for anything not live, so the screen can 404 honestly. */
export async function getJob(slug: string): Promise<JobPost | null> {
  const { data, error } = await liveQuery().eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as unknown as JobPost) ?? null;
}

/** Live ads for one business — the profile section. */
export async function listBusinessJobs(businessId: string, limit = 10): Promise<JobPost[]> {
  const { data, error } = await liveQuery()
    .eq("business_id", businessId)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as JobPost[];
}

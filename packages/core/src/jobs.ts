// ============================================================================
// Source: packages/core/src/jobs.ts
// Version: 1.1.0 — 2026-08-18 (markdown descriptions + AI-assist limits)
// Why: One definition of what a job post is and when it is live. The public
//      board, the business profile, the owner's manager, the admin queue and
//      (later) mobile must agree, and they only agree if they read this file.
// Env / Identity: Pure. No IO, no Supabase — safe on both server and client.
// ============================================================================

export type EmploymentType = "full_time" | "part_time" | "contract" | "casual" | "internship";
export type WorkplaceType = "on_site" | "hybrid" | "remote";
export type SalaryPeriod = "hour" | "month" | "year";
export type ApplyMethod = "email" | "phone" | "url";
export type JobStatus = "pending_moderation" | "published" | "rejected" | "closed";

export const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract", "casual", "internship"];
export const WORKPLACE_TYPES: WorkplaceType[] = ["on_site", "hybrid", "remote"];
export const SALARY_PERIODS: SalaryPeriod[] = ["hour", "month", "year"];

export const EMPLOYMENT_TYPE_LABELS_FA: Record<EmploymentType, string> = {
  full_time: "تمام‌وقت",
  part_time: "پاره‌وقت",
  contract: "قراردادی",
  casual: "موقت / پروژه‌ای",
  internship: "کارآموزی",
};

export const WORKPLACE_TYPE_LABELS_FA: Record<WorkplaceType, string> = {
  on_site: "حضوری",
  hybrid: "ترکیبی",
  remote: "دورکاری",
};

export const SALARY_PERIOD_LABELS_FA: Record<SalaryPeriod, string> = {
  hour: "ساعتی",
  month: "ماهانه",
  year: "سالانه",
};

export const JOB_STATUS_LABELS_FA: Record<JobStatus, string> = {
  pending_moderation: "در انتظار بررسی",
  published: "منتشر شده",
  rejected: "رد شده",
  closed: "بسته شده",
};

/** schema.org employmentType values, for the JobPosting block that puts this in Google Jobs. */
export const EMPLOYMENT_TYPE_SCHEMA: Record<EmploymentType, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  casual: "TEMPORARY",
  internship: "INTERN",
};

/**
 * How many posts one business may create per rolling 24 hours.
 *
 * This exists because jobs are free and unlimited and verified businesses
 * publish without moderation — so without a ceiling one account could put
 * fifty ads on the board in an afternoon. It is a rate limit, not a plan
 * quantity: do not move it into plans.ts.
 */
export const JOB_POSTS_PER_DAY = 5;

/** Default life of a post. A board full of dead ads is worse than no board. */
export const JOB_DEFAULT_DAYS = 30;
export const JOB_MAX_DAYS = 60;

export const JOB_TITLE_MAX = 120;
export const JOB_DESCRIPTION_MIN = 40;
export const JOB_DESCRIPTION_MAX = 5000;

export interface LiveJudgeableJob {
  status?: string | null;
  closed_at?: string | null;
  expires_at?: string | null;
}

/**
 * The one rule for "is this post live".
 *
 * Expiry is not a status — it is a comparison against now(), evaluated every
 * time anyone asks. The same shape as verified_until / plan_until /
 * busy_status_until, and the reason no cron job is needed to keep the board
 * from advertising jobs that closed last month.
 */
export function isJobLive(job: LiveJudgeableJob, now = new Date()): boolean {
  if (job.status !== "published") return false;
  if (job.closed_at) return false;
  if (!job.expires_at) return false;
  return new Date(job.expires_at) > now;
}

/** Days left before expiry; negative once past. `null` when there is no expiry to speak of. */
export function jobDaysRemaining(job: LiveJudgeableJob, now = new Date()): number | null {
  if (!job.expires_at) return null;
  return Math.ceil((new Date(job.expires_at).getTime() - now.getTime()) / 86_400_000);
}

export interface SalaryShape {
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: string | null;
  salary_is_public?: boolean | null;
}

/**
 * Persian salary line, or «حقوق توافقی» — never an empty space where a number
 * was expected. Returns null only when the caller should render nothing at all.
 */
export function formatSalaryFa(job: SalaryShape): string {
  if (!job.salary_is_public || !job.salary_min) return "حقوق توافقی";
  const period = job.salary_period && job.salary_period in SALARY_PERIOD_LABELS_FA
    ? SALARY_PERIOD_LABELS_FA[job.salary_period as SalaryPeriod]
    : "";
  const fa = (n: number) => n.toLocaleString("fa-IR");
  const range = job.salary_max && job.salary_max > job.salary_min
    ? `${fa(job.salary_min)} تا ${fa(job.salary_max)}`
    : `از ${fa(job.salary_min)}`;
  return `${range} دلار کانادا${period ? ` (${period})` : ""}`;
}

/** The language requirement, which is the whole point of this board. `null` when none is stated. */
export function languageRequirementFa(job: { requires_persian?: boolean | null; requires_english?: boolean | null }): string | null {
  if (job.requires_persian && job.requires_english) return "فارسی و انگلیسی";
  if (job.requires_persian) return "فارسی";
  if (job.requires_english) return "انگلیسی";
  return null;
}

/** Basic shape check on the contact the applicant will be handed. */
export function isValidApplyValue(method: ApplyMethod, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (method === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  if (method === "url") return /^https?:\/\/[^\s]+\.[^\s]{2,}/i.test(v);
  // Phone: digits are folded to ASCII by the caller before this runs — the app
  // is RTL and the keyboard opens in Persian, so ۶۴۷ never reaches here as 647
  // on its own. See docs/06-gotchas.md.
  return v.replace(/\D/g, "").length >= 10;
}

// ---------------------------------------------------------------------------
// Descriptions are Markdown
//
// A job description needs structure — «وظایف», «شرایط», a bullet list — and a
// single textarea produces a wall of text nobody reads. The stored format is
// Markdown, never HTML, and that is a security decision as much as a product
// one: nothing a business owner types is ever handed to a browser as markup.
// The renderer (react-markdown, no rehype-raw) treats raw HTML as literal
// text, so even if this normaliser were bypassed there is no second failure.
// ---------------------------------------------------------------------------

/** The only Markdown a job description may carry. Anything else is stripped. */
export const JOB_MARKDOWN_ALLOWED = [
  "bold", "italic", "unordered list", "ordered list", "h3", "blockquote",
] as const;

/**
 * Normalise owner- or model-written Markdown down to the allowed subset.
 *
 * Removes, in order and for stated reasons:
 *   · HTML tags — the renderer would show them as text anyway, and leaving
 *     them in makes the stored value look like markup to the next reader.
 *   · images — a remote `![](…)` on a public page is a tracking pixel and a
 *     hotlink to somebody else's bandwidth.
 *   · links — an ad is not a place to send traffic; the apply button is the
 *     one destination, and this closes the obvious spam route onto a page
 *     that a verified business can publish without moderation.
 *   · h1/h2 — a section heading inside a card must not outrank the page's
 *     own h1.
 * Link text is kept, so «[سایت ما](http://…)» degrades to «سایت ما» rather
 * than vanishing and taking a sentence with it.
 */
export function normalizeJobMarkdown(input: string): string {
  return (input ?? "")
    .replace(/<[^>]*>/g, "")
    // One level of nested parens, so `[x](javascript:alert(1))` does not leave
    // a stray `)` behind when the URL itself contains brackets.
    .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "")
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/^\s{0,3}#{1,2}\s+/gm, "### ")
    .replace(/^\s{0,3}#{4,}\s+/gm, "### ")
    // A bare URL is the same spam route as a link, one syntax down.
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .trim();
}

/**
 * Markdown reduced to the plain text underneath it.
 *
 * For the JSON-LD `description` and the meta description, where the raw
 * asterisks of «**وظایف**» would be published as characters.
 */
export function stripMarkdown(input: string): string {
  return (input ?? "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "· ")
    .replace(/^\s{0,3}\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * A description reduced to publishable plain text.
 *
 * Normalise FIRST, then strip. stripMarkdown() only understands Markdown
 * syntax — it will happily carry an `<img onerror=…>`, a `javascript:` link or
 * a spam URL straight through, because none of those are Markdown. That is
 * exactly what happened to the JSON-LD `description` on 18 Aug: the rendered
 * page was clean because the renderer normalises, and the structured data was
 * not, because it only stripped. Both orders of operation matter, so there is
 * now one function that does them in the right one.
 *
 * Use this for anything that leaves the page as text: meta description,
 * OpenGraph, and the `JobPosting` description Google reads.
 */
export function jobDescriptionPlain(input: string): string {
  return stripMarkdown(normalizeJobMarkdown(input));
}

/** Length is judged on the words, not on the syntax that formats them. */
export function jobDescriptionLength(input: string): number {
  return jobDescriptionPlain(input).length;
}

// ---------------------------------------------------------------------------
// AI writing help
// ---------------------------------------------------------------------------

/**
 * Drafts per user per 24 hours.
 *
 * Counted in the database (ai_usage), not in lib/utils/rate-limit.ts, because
 * this one bounds a real bill and an in-memory counter grants its full quota
 * once per instance. Not a plan quantity — do not move it into plans.ts.
 */
export const JOB_AI_DRAFTS_PER_DAY = 10;

/** How much of the owner's own note the drafting endpoint will read. */
export const JOB_AI_NOTES_MAX = 1200;

/**
 * What the model is allowed to be told, and nothing else.
 *
 * Assembled server-side from the row, never from the client: the whole point
 * is that the draft cannot contain a salary, a city or a company fact that
 * the listing itself does not already carry.
 */
export interface JobDraftFacts {
  businessName: string;
  category?: string | null;
  city?: string | null;
  title: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  requiresPersian: boolean;
  requiresEnglish: boolean;
  salaryLine: string;
}

"use server";

// ============================================================================
// Source: lib/actions/jobs.ts
// Version: 1.1.0 — 2026-08-18 (Markdown descriptions)
// Why: Every write to job_posts. No RLS policy grants a regular user insert,
//      update or delete on that table (see the migration) — three of the
//      decisions that govern a post cannot be expressed in a policy:
//        · the 24h rate limit, counted in the database via
//          job_posts_recent_count() and not lib/utils/rate-limit.ts, which
//          resets on deploy (the 5c80228 lesson);
//        · whether the poster is verified today, which decides publish vs
//          queue and is a computed comparison against verified_until;
//        · whether the parent listing is public at all.
//      So this file is where the gate actually lives, same shape as
//      announcements, gallery and busy_status.
// Env / Identity: Server-side, authenticated. Only the business's own owner
//      (created_by or owner_user_id) may post; only an admin may moderate.
// ============================================================================

import { revalidatePath } from "next/cache";

import {
  EMPLOYMENT_TYPES,
  JOB_DEFAULT_DAYS,
  JOB_DESCRIPTION_MAX,
  JOB_DESCRIPTION_MIN,
  JOB_MAX_DAYS,
  JOB_POSTS_PER_DAY,
  JOB_TITLE_MAX,
  SALARY_PERIODS,
  WORKPLACE_TYPES,
  getVerificationStatus,
  isTrusted,
  isValidApplyValue,
  jobDescriptionLength,
  latinSlug,
  normalizeJobMarkdown,
  type ApplyMethod,
  type EmploymentType,
  type SalaryPeriod,
  type WorkplaceType,
} from "@charana/core";

import { requireAdmin } from "@/lib/auth/require-admin";
import { toLatinDigits } from "@/lib/utils/digits";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export type JobInput = {
  title: string;
  description: string;
  employmentType: string;
  workplaceType: string;
  city?: string | null;
  province?: string | null;
  salaryIsPublic: boolean;
  salaryMin?: string | number | null;
  salaryMax?: string | number | null;
  salaryPeriod?: string | null;
  requiresPersian: boolean;
  requiresEnglish: boolean;
  applyMethod: string;
  applyValue: string;
  days?: number | null;
};

/** Everything the decisions below need, in one read. */
async function loadOwnedBusiness(businessId: string, userId: string) {
  const supabase = await createSupabaseActionClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, status, city, province, phone, contact_email, created_by, owner_user_id, verification_method, verified_at, verified_until, verified_phone, verified_email")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return null;
  if (business.created_by !== userId && business.owner_user_id !== userId) return null;
  return business;
}

/**
 * An English slug that is unique across the table.
 *
 * The title alone collides constantly — half the board will be «آشپز» — so the
 * business name is part of the base, and a numeric suffix settles the rest.
 * Falls back to "job" only when transliteration yields nothing at all, which
 * happens for a title that is pure punctuation or emoji.
 */
async function uniqueSlug(admin: ReturnType<typeof createSupabaseAdminClient>, title: string, businessName: string) {
  const base = latinSlug(`${title} ${businessName}`, 70) || "job";
  const { data: taken } = await admin.from("job_posts").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug as string));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function parseAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  // Persian digits first. The app forces RTL and the keyboard opens in Persian,
  // so a salary typed as ۲۵ arrives with no ASCII digit in it at all.
  const n = Number(toLatinDigits(String(value)).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function createJob(businessId: string, input: JobInput) {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const business = await loadOwnedBusiness(businessId, user.id);
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    // No jobs on a listing the public cannot open — the ad would link nowhere.
    if (business.status !== "PUBLISHED" && business.status !== "APPROVED") {
      return { success: false, error: "تا وقتی این کسب‌وکار منتشر نشده، آگهی استخدامش جایی برای نمایش ندارد." };
    }

    // ---- content
    const title = input.title.trim();
    if (!title) return { success: false, error: "عنوان شغل را بنویس." };
    if (title.length > JOB_TITLE_MAX) return { success: false, error: `عنوان نباید بیشتر از ${JOB_TITLE_MAX} کاراکتر باشد.` };

    // Normalised here, not only in the editor. The editor is a convenience;
    // this is the boundary. Whatever HTML, image, link or bare URL a crafted
    // request carries is gone before it reaches the column, so the public
    // renderer is never the only thing standing between an owner and a
    // browser. See normalizeJobMarkdown() for what goes and why.
    const description = normalizeJobMarkdown(input.description);
    // Measured on the words, not on the Markdown that formats them — otherwise
    // «**وظایف**» buys four characters of the minimum for free.
    const descriptionLength = jobDescriptionLength(description);
    if (descriptionLength < JOB_DESCRIPTION_MIN) {
      return { success: false, error: `شرح شغل خیلی کوتاه است — دست‌کم ${JOB_DESCRIPTION_MIN} کاراکتر بنویس.` };
    }
    if (description.length > JOB_DESCRIPTION_MAX) {
      return { success: false, error: `شرح شغل نباید بیشتر از ${JOB_DESCRIPTION_MAX} کاراکتر باشد.` };
    }

    const employmentType = (EMPLOYMENT_TYPES as string[]).includes(input.employmentType)
      ? (input.employmentType as EmploymentType)
      : null;
    if (!employmentType) return { success: false, error: "نوع همکاری نامعتبر است." };

    const workplaceType = (WORKPLACE_TYPES as string[]).includes(input.workplaceType)
      ? (input.workplaceType as WorkplaceType)
      : null;
    if (!workplaceType) return { success: false, error: "نوع محل کار نامعتبر است." };

    // ---- salary. Optional for now (Farjad, 18 Aug) — see the migration's
    // header for what changes if Ontario's 2026 rules turn out to require it.
    const salaryMin = parseAmount(input.salaryMin);
    const salaryMax = parseAmount(input.salaryMax);
    const salaryPeriod = (SALARY_PERIODS as string[]).includes(String(input.salaryPeriod))
      ? (input.salaryPeriod as SalaryPeriod)
      : null;
    const salaryIsPublic = Boolean(input.salaryIsPublic);
    if (salaryIsPublic && (!salaryMin || !salaryPeriod)) {
      return { success: false, error: "برای نمایش حقوق، دست‌کم حداقل مبلغ و بازه (ساعتی/ماهانه/سالانه) را وارد کن — وگرنه «توافقی» را انتخاب کن." };
    }
    if (salaryMin && salaryMax && salaryMax < salaryMin) {
      return { success: false, error: "حداکثر حقوق نمی‌تواند از حداقل کمتر باشد." };
    }

    // ---- how to apply
    const applyMethod = ["email", "phone", "url"].includes(input.applyMethod)
      ? (input.applyMethod as ApplyMethod)
      : null;
    if (!applyMethod) return { success: false, error: "روش درخواست نامعتبر است." };
    const applyValue = applyMethod === "phone" ? toLatinDigits(input.applyValue).trim() : input.applyValue.trim();
    if (!isValidApplyValue(applyMethod, applyValue)) {
      return {
        success: false,
        error:
          applyMethod === "email" ? "ایمیل درخواست معتبر نیست."
          : applyMethod === "url" ? "لینک درخواست باید با http یا https شروع شود."
          : "شماره تماس معتبر نیست.",
      };
    }

    // ---- the abuse ceiling, counted in the database
    const admin = createSupabaseAdminClient();
    const { data: recent, error: countError } = await admin.rpc("job_posts_recent_count", { p_business_id: businessId });
    if (countError) throw countError;
    if ((recent ?? 0) >= JOB_POSTS_PER_DAY) {
      return { success: false, error: `در ۲۴ ساعت گذشته ${JOB_POSTS_PER_DAY} آگهی ثبت کرده‌ای. فردا دوباره امتحان کن.` };
    }

    // ---- verified publishes directly; everyone else queues.
    // Recomputed from verified_until, never read off a stored flag: a badge
    // that lapsed last week must not still be buying a fast path.
    const trusted = isTrusted(getVerificationStatus(business));

    const days = Math.min(Math.max(Number(input.days) || JOB_DEFAULT_DAYS, 1), JOB_MAX_DAYS);
    const slug = await uniqueSlug(admin, title, (business.name as string) ?? "");
    const now = new Date();

    const { error } = await admin.from("job_posts").insert({
      business_id: businessId,
      created_by: user.id,
      slug,
      title,
      description,
      employment_type: employmentType,
      workplace_type: workplaceType,
      // The business's own city is the default, but the owner may have set
      // another one — a Toronto office hiring in Vancouver.
      city: input.city?.trim() || business.city || null,
      province: input.province?.trim() || business.province || null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_period: salaryPeriod,
      salary_is_public: salaryIsPublic,
      requires_persian: Boolean(input.requiresPersian),
      requires_english: Boolean(input.requiresEnglish),
      apply_method: applyMethod,
      apply_value: applyValue,
      status: trusted ? "published" : "pending_moderation",
      published_at: trusted ? now.toISOString() : null,
      expires_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    });
    if (error) throw error;

    revalidatePath(`/dashboard/business/${businessId}/jobs`);
    revalidatePath("/jobs");
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    if (!trusted) revalidatePath("/admin/jobs");

    return {
      success: true,
      published: trusted,
      message: trusted
        ? "آگهی منتشر شد."
        : "آگهی ثبت شد و در صف بررسی است. کسب‌وکارهای تاییدشده بدون بررسی منتشر می‌شوند.",
    };
  } catch (error: any) {
    console.error("Create Job Error:", error);
    return { success: false, error: error.message };
  }
}

/** Close a post early. Closing is not deleting: the row stays as the owner's history. */
export async function closeJob(jobId: string, businessId: string) {
  return ownerMutate(jobId, businessId, { closed_at: new Date().toISOString(), status: "closed" }, "آگهی بسته شد.");
}

/** Reopen or extend. Extending from *now* rather than from the old expiry is deliberate: a post revived after it lapsed gets a full window, not a retroactive one. */
export async function extendJob(jobId: string, businessId: string, days = JOB_DEFAULT_DAYS) {
  const window = Math.min(Math.max(Number(days) || JOB_DEFAULT_DAYS, 1), JOB_MAX_DAYS);
  return ownerMutate(
    jobId,
    businessId,
    { expires_at: new Date(Date.now() + window * 86_400_000).toISOString(), closed_at: null },
    "مدت آگهی تمدید شد."
  );
}

async function ownerMutate(jobId: string, businessId: string, patch: Record<string, unknown>, okMessage: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const business = await loadOwnedBusiness(businessId, user.id);
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    const admin = createSupabaseAdminClient();

    // Reopening must not resurrect something a moderator rejected, and must
    // not skip a queue the poster never cleared.
    if (patch.closed_at === null) {
      const { data: existing } = await admin.from("job_posts").select("status").eq("id", jobId).maybeSingle();
      if (existing?.status === "rejected") {
        return { success: false, error: "این آگهی رد شده و با تمدید برنمی‌گردد." };
      }
      if (existing?.status === "closed") patch.status = "published";
    }

    const { error } = await admin.from("job_posts").update(patch).eq("id", jobId).eq("business_id", businessId);
    if (error) throw error;

    revalidatePath(`/dashboard/business/${businessId}/jobs`);
    revalidatePath("/jobs");
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    return { success: true, message: okMessage };
  } catch (error: any) {
    console.error("Job Mutate Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Admin decision on a queued post.
 *
 * Only ever touches posts that are actually waiting: re-moderating a live one
 * from a stale queue page would silently unpublish it.
 */
export async function moderateJob(jobId: string, decision: "published" | "rejected", reason?: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const user = await requireAdmin(supabase);

    if (decision === "rejected" && !reason?.trim()) {
      return { success: false, error: "دلیل رد را بنویس — بدون دلیل، آگهی‌دهنده نمی‌داند چه چیزی را اصلاح کند." };
    }

    const admin = createSupabaseAdminClient();
    const { data: job } = await admin
      .from("job_posts")
      .select("id, status, business_id, businesses(slug)")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return { success: false, error: "آگهی پیدا نشد." };
    if (job.status !== "pending_moderation") {
      return { success: false, error: "این آگهی دیگر در صف بررسی نیست." };
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("job_posts")
      .update({
        status: decision,
        moderation_reason: reason?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: now,
        published_at: decision === "published" ? now : null,
      })
      .eq("id", jobId);
    if (error) throw error;

    revalidatePath("/admin/jobs");
    revalidatePath("/jobs");
    revalidatePath(`/dashboard/business/${job.business_id}/jobs`);
    const slug = (job as { businesses?: { slug?: string } | null }).businesses?.slug;
    if (slug) revalidatePath(`/businesses/${slug}`);

    return { success: true, message: decision === "published" ? "آگهی منتشر شد." : "آگهی رد شد." };
  } catch (error: any) {
    console.error("Moderate Job Error:", error);
    return { success: false, error: error.message };
  }
}

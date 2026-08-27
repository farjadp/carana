// ============================================================================
// Source: app/dashboard/business/[id]/edit/actions.ts
// Version: 1.0.0 — 2026-08-13
// Why: Server action for fetching and re-submitting an existing business for review.
// After any edit by the user, the status is reset to SUBMITTED (pending review).
// Env / Identity: Server-side, authenticated. Only the creator can edit.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { logUserActivity } from "@/lib/actions/logs";
import { reviewListingChange, type ChangeReview } from "@/lib/moderation/change-review";
import { foldContactDigits } from "@/lib/business/fold-contact-digits";
import { entitlementsFor } from "@/lib/billing/entitlements";

export type EditActionResult = {
  success: boolean;
  error?: string;
  /** Listing status after the write. */
  status?: string;
  /** Present when the edit went through the change classifier. */
  review?: ChangeReview;
  /** User-facing explanation of what the classifier decided. */
  message?: string;
};

/**
 * Columns an owner is allowed to write.
 *
 * The previous code spread the whole client payload straight into update(),
 * so a request carrying `status: 'PUBLISHED'` (or created_by, slug, id …) was
 * applied verbatim. RLS now blocks that too, but the whitelist keeps the
 * failure at the application edge where the error message is useful.
 */
const OWNER_EDITABLE_COLUMNS = [
  "name", "name_en", "category", "sub_category", "tagline",
  "short_description", "description", "established_year", "ownership_status",
  "country", "province", "city", "address", "postal_code", "is_address_public",
  "service_type", "service_area", "google_maps_url",
  "phone", "whatsapp", "contact_email", "website",
  "instagram", "telegram", "linkedin", "preferred_contact",
  "business_number", "license_info", "languages", "is_iranian_owned",
  "verification_notes",
  "logo_url", "cover_url", "brand_color",
  "working_hours", "accepts_appointments", "booking_url",
  "services", "branches",
  "gallery_urls", "gallery_video_url",
] as const;

/**
 * @param existing The row before this edit — needed to know the plan, so the
 * gallery cap can't be raised by a client that just sends more URLs than the
 * uploader UI allowed. The UI limit is a convenience; this is the gate (same
 * rule as `lib/billing/entitlements.ts`: a UI check alone is not enough).
 */
function pickOwnerFields(formData: Record<string, unknown>, existing: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const key of OWNER_EDITABLE_COLUMNS) {
    if (!(key in formData)) continue;
    const value = formData[key];
    // Trim every text field. `city` is the one that bites: the city pages
    // match it with ilike against an exact name, so a single trailing space
    // makes a listing invisible on its own city page while it still counts
    // in the geo index — the page's title and its own counter then disagree.
    // One live row was in exactly that state ("Toronto ").
    payload[key] = typeof value === "string" ? value.trim() : value;
  }

  const year = payload.established_year;
  if (year === "" || year === null || year === undefined) {
    payload.established_year = null;
  } else if (typeof year === "string") {
    const parsed = Number.parseInt(year, 10);
    payload.established_year = Number.isNaN(parsed) ? null : parsed;
  }

  const ent = entitlementsFor(existing as { plan?: string | null; plan_until?: string | null });
  if (Array.isArray(payload.gallery_urls)) {
    const limit = ent.galleryLimit.photos;
    payload.gallery_urls = limit === null ? payload.gallery_urls : payload.gallery_urls.slice(0, limit);
  }
  if (!ent.galleryLimit.video && "gallery_video_url" in payload) {
    payload.gallery_video_url = existing.gallery_video_url ?? null;
  }

  // Phone-like fields digit-folded on top of the trim: the public page puts
  // these inside tel: links, where a Persian digit is a dead link.
  return foldContactDigits(payload);
}

/**
 * واکشی داده‌های یک کسب‌وکار برای پر کردن فرم ویرایش.
 * فقط کاربری که آن را ثبت کرده می‌تواند دسترسی داشته باشد.
 */
export async function getBusinessForEdit(businessId: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "کاربر وارد نشده است." };

    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      // Both routes to ownership, same as the dashboard list and the public
      // profile: `created_by` for a listing registered through onboarding,
      // `owner_user_id` for one claimed by SMS after an admin imported it.
      // `created_by` alone meant a claimed listing appeared on its owner's
      // dashboard and then 404'd when they pressed Edit — on 5,600 imported
      // rows created_by is the importer, not a person.
      .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`)
      .single();

    if (error || !business) {
      return { success: false, error: "کسب‌وکار یافت نشد یا دسترسی مجاز نیست." };
    }

    // همه وضعیت‌ها قابل ویرایش هستند. اگر کسب‌وکار منتشر شده باشد و ویرایش شود، 
    // بسته به منطق برنامه ممکن است به حالت در انتظار تایید برگردد.
    const editableStatuses = ["DRAFT", "SUBMITTED", "NEEDS_CHANGES", "REJECTED", "APPROVED", "PUBLISHED"];
    if (!editableStatuses.includes(business.status)) {
      return { success: false, error: `کسب‌وکار در وضعیت «${business.status}» قابل ویرایش نیست.` };
    }

    return { success: true, business };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ذخیره ویرایش‌های کاربر به صورت پیش‌نویس (بدون ارسال برای بررسی).
 */
export async function saveBusinessEditDraft(formData: any, businessId: string): Promise<EditActionResult> {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "کاربر وارد نشده است." };

    const { data: existing } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      // Both routes to ownership, same as the dashboard list and the public
      // profile: `created_by` for a listing registered through onboarding,
      // `owner_user_id` for one claimed by SMS after an admin imported it.
      // `created_by` alone meant a claimed listing appeared on its owner's
      // dashboard and then 404'd when they pressed Edit — on 5,600 imported
      // rows created_by is the importer, not a person.
      .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`)
      .single();

    if (!existing) return { success: false, error: "کسب‌وکار یافت نشد." };

    const updates = pickOwnerFields(formData, existing);

    // A listing that is not live yet can be edited freely — nothing public
    // changes until it is submitted and approved.
    if (existing.status !== "PUBLISHED" && existing.status !== "APPROVED") {
      const { error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", businessId)
        .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`);

      if (error) throw error;

      await logUserActivity("PROFILE_UPDATE", {
        type: "business_edit_draft",
        business_id: businessId,
      });
      revalidatePath(`/dashboard/business/${businessId}/edit`);

      return { success: true, status: existing.status };
    }

    // The listing is live. Classify the edit before letting it stay live.
    return await applyReviewedEdit({
      businessId,
      userId: user.id,
      existing,
      updates,
    });
  } catch (error: any) {
    console.error("Edit draft error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply an edit to a live listing after classifying it.
 *
 * Routine changes stay published. Identity, trust or content-sensitive changes
 * drop the listing back to SUBMITTED so a moderator sees the new version.
 *
 * The write itself uses the service role because RLS deliberately forbids an
 * owner from updating a PUBLISHED row — that is what stops a client from
 * skipping this function by talking to PostgREST directly. Ownership has
 * already been proven by the ownership filter above (created_by OR
 * owner_user_id — a claimed listing's owner is the latter).
 */
async function applyReviewedEdit({
  businessId,
  userId,
  existing,
  updates,
}: {
  businessId: string;
  userId: string;
  existing: Record<string, any>;
  updates: Record<string, unknown>;
}): Promise<EditActionResult> {
  const review = await reviewListingChange(existing, updates);

  if (review.changedFields.length === 0) {
    return { success: true, status: existing.status, review };
  }

  const resultingStatus =
    review.decision === "auto_approve" ? existing.status : "SUBMITTED";

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("businesses")
    .update({ ...updates, status: resultingStatus })
    .eq("id", businessId)
    .or(`created_by.eq.${userId},owner_user_id.eq.${userId}`);

  if (error) throw error;

  await admin.from("business_change_reviews").insert({
    business_id: businessId,
    user_id: userId,
    changed_fields: review.changedFields,
    critical_fields: review.criticalFields,
    decision: review.decision,
    reason: review.reason,
    ai_verdict: review.aiVerdict,
    previous_status: existing.status,
    resulting_status: resultingStatus,
  });

  await logUserActivity("PROFILE_UPDATE", {
    type: "business_edit_reviewed",
    business_id: businessId,
    decision: review.decision,
    changed_fields: review.changedFields,
  });

  revalidatePath("/dashboard/business");
  revalidatePath(`/dashboard/business/${businessId}/edit`);
  if (existing.slug) revalidatePath(`/businesses/${existing.slug}`);

  return {
    success: true,
    status: resultingStatus,
    review,
    message:
      review.decision === "auto_approve"
        ? "تغییرات شما بررسی خودکار شد و بلافاصله منتشر شد."
        : `تغییرات ذخیره شد و برای بازبینی ارسال شد. دلیل: ${review.reason}`,
  };
}

/**
 * ارسال مجدد برای بررسی (پس از ویرایش).
 * ⚡ وضعیت به SUBMITTED تغییر می‌کند تا ادمین بتواند نسخه جدید را تایید کند.
 */
export async function resubmitBusinessForReview(formData: any, businessId: string): Promise<EditActionResult> {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "کاربر وارد نشده است." };

    // بررسی اینکه این کسب‌وکار متعلق به کاربر است
    const { data: existing } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      // Both routes to ownership, same as the dashboard list and the public
      // profile: `created_by` for a listing registered through onboarding,
      // `owner_user_id` for one claimed by SMS after an admin imported it.
      // `created_by` alone meant a claimed listing appeared on its owner's
      // dashboard and then 404'd when they pressed Edit — on 5,600 imported
      // rows created_by is the importer, not a person.
      .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`)
      .single();

    if (!existing) return { success: false, error: "کسب‌وکار یافت نشد." };

    const isLive = existing.status === "PUBLISHED" || existing.status === "APPROVED";

    // A live listing goes through the classifier: if the edit turns out to be
    // routine there is no reason to pull it down and queue a moderator.
    if (isLive) {
      return await applyReviewedEdit({
        businessId,
        userId: user.id,
        existing,
        updates: pickOwnerFields(formData, existing),
      });
    }

    // Not live yet — this is the normal "submit for review" path.
    const { error } = await supabase
      .from("businesses")
      .update({
        ...pickOwnerFields(formData, existing),
        status: "SUBMITTED",
      })
      .eq("id", businessId)
      .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`);

    if (error) throw error;

    // ثبت لاگ با وضعیت قبلی برای ردیابی
    await logUserActivity("PROFILE_UPDATE", {
      type: "business_resubmitted",
      business_id: businessId,
      business_name: existing.name,
      previous_status: existing.status,
    });

    revalidatePath("/dashboard/business");
    revalidatePath(`/dashboard/business/${businessId}/edit`);

    return { success: true };
  } catch (error: any) {
    console.error("Resubmit error:", error);
    return { success: false, error: error.message };
  }
}

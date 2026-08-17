"use server";

// ============================================================================
// Source: lib/actions/interactions.ts
// Version: 1.0.0 — 2026-08-14
// Why: Server actions for User-Business Interactions (Save, Note, Rate, Review)
// Env / Identity: Server
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { sendEmail } from "@/lib/email/send";
import { newReviewEmail, reviewModeratedEmail } from "@/lib/email/templates";

// ----------------------------------------------------------------------------
// انواع داده
// ----------------------------------------------------------------------------
type PersonalInteractionStatus = 
  | "none" | "saved" | "want_to_go" | "visited_liked" 
  | "visited_neutral" | "visited_disliked" | "customer" 
  | "recommended" | "follow_up_needed";

interface InteractionData {
  personal_status?: PersonalInteractionStatus;
  personal_rating?: number | null;
  private_title?: string | null;
  private_note?: string | null;
  would_return?: "yes" | "maybe" | "no" | null;
  private_media_urls?: string[];
  private_media_types?: string[];
  /** Explicit opt-in for an email when this business posts an announcement.
   *  Not implied by personal_status = "saved" — see the migration. */
  notify_announcements?: boolean;
}

/**
 * Review guards. The numbers are deliberately generous for a real person
 * and cheap for a script to hit: someone writing thoughtfully about five
 * businesses in a day is plausible, someone writing about fifty is not.
 */
const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 2000;
const MAX_REVIEWS_PER_WINDOW = 5;
const REVIEW_WINDOW_HOURS = 24;

interface PublicReviewData {
  public_title?: string;
  public_body: string;
  public_rating: number;
  display_identity?: "real_name" | "display_name" | "anonymous";
  recommends?: boolean;
}

// ----------------------------------------------------------------------------
// اکشن‌ها
// ----------------------------------------------------------------------------

/**
 * بروزرسانی یا ایجاد Interaction برای یک کاربر نسبت به یک کسب‌وکار (وضعیت، امتیاز، یادداشت خصوصی)
 */
export async function upsertUserInteraction(businessId: string, data: InteractionData) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: business } = await supabase.from("businesses").select("id, slug").eq("id", businessId).single();
    if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

    // بررسی وجود رکورد تعامل قبلی
    const { data: existingInteraction } = await supabase
      .from("user_business_interactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("business_id", businessId)
      .maybeSingle();

    if (existingInteraction) {
      const { error } = await supabase
        .from("user_business_interactions")
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingInteraction.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_business_interactions")
        .insert({
          user_id: user.id,
          business_id: businessId,
          ...data,
        });

      if (error) throw error;
    }

    revalidatePath(`/businesses/${business.slug}`);
    revalidatePath(`/profile/interactions`);
    return { success: true };
  } catch (error: any) {
    console.error("Upsert Interaction Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ارسال یک نظر عمومی برای بررسی (Moderation)
 */
export async function submitPublicReview(businessId: string, data: PublicReviewData) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    // The client checks this too; the client is not the gate. A request
    // straight to the action skips that form entirely.
    const body = data.public_body?.trim() ?? "";
    if (body.length < MIN_REVIEW_LENGTH) {
      return { success: false, error: `متن نظر باید حداقل ${MIN_REVIEW_LENGTH} کاراکتر باشد.` };
    }
    if (body.length > MAX_REVIEW_LENGTH) {
      return { success: false, error: `متن نظر نباید بیشتر از ${MAX_REVIEW_LENGTH} کاراکتر باشد.` };
    }
    if (!Number.isInteger(data.public_rating) || data.public_rating < 1 || data.public_rating > 5) {
      return { success: false, error: "امتیاز باید بین ۱ تا ۵ باشد." };
    }

    // A business owner reviewing their own listing is not a review, it is a
    // testimonial they wrote about themselves. Both ownership columns are
    // checked — created_by alone misses every claimed listing.
    const { data: target } = await supabase
      .from("businesses")
      .select("id, created_by, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!target) return { success: false, error: "کسب‌وکار یافت نشد." };
    if (target.created_by === user.id || target.owner_user_id === user.id) {
      return { success: false, error: "برای کسب‌وکار خودت نمی‌توانی نظر ثبت کنی." };
    }

    // آیا کاربر از قبل نظری برای این کسب‌وکار دارد؟
    const { data: existingReview } = await supabase
      .from("public_reviews")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("business_id", businessId)
      .not("status", "eq", "deleted_by_user")
      .maybeSingle();

    if (existingReview) {
      // اگر نظری دارد فقط آپدیت می‌کنیم و به صف بررسی برمی‌گردانیم
      const { error } = await supabase
        .from("public_reviews")
        .update({
          ...data,
          status: "pending_moderation",
          updated_at: new Date().toISOString()
        })
        .eq("id", existingReview.id);

      if (error) throw error;
    } else {
      // Cap NEW reviews only — editing your own existing one is not the
      // abuse case. Counted in the database over a rolling window rather
      // than lib/utils/rate-limit.ts, whose own header says it resets on
      // deploy and is not shared between instances: a spammer just needs a
      // different instance or a deploy to reset it. Same approach as the
      // announcement quota.
      const since = new Date(Date.now() - REVIEW_WINDOW_HOURS * 3600_000).toISOString();
      const { count } = await supabase
        .from("public_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);

      if ((count ?? 0) >= MAX_REVIEWS_PER_WINDOW) {
        return {
          success: false,
          error: `در ${REVIEW_WINDOW_HOURS} ساعت گذشته ${MAX_REVIEWS_PER_WINDOW} نظر ثبت کرده‌ای. کمی بعد دوباره امتحان کن.`,
        };
      }

      // گرفتن interaction_id (در صورت وجود) برای پیوند دادن
      const { data: interaction } = await supabase
        .from("user_business_interactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", businessId)
        .maybeSingle();

      const { error } = await supabase
        .from("public_reviews")
        .insert({
          user_id: user.id,
          business_id: businessId,
          source_interaction_id: interaction?.id || null,
          status: "pending_moderation",
          ...data,
        });

      if (error) throw error;
    }

    revalidatePath(`/profile/interactions`);
    return { success: true };
  } catch (error: any) {
    console.error("Submit Review Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * پنل ادمین: تغییر وضعیت یک نظر (تایید، رد و ...)
 */
export async function moderateReview(reviewId: string, status: string, reason?: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const user = await requireAdmin(supabase);

    const validStatuses = [
      "approved",
      "published",
      "needs_changes",
      "rejected",
      "hidden",
    ];
    if (!validStatuses.includes(status)) {
      return { success: false, error: "وضعیت نامعتبر است." };
    }

    const { error } = await supabase
      .from("public_reviews")
      .update({
        status,
        moderation_reason: reason || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", reviewId);

    if (error) throw error;

    // Best-effort and never awaited to completion: a mail failure must not
    // make a moderation decision that already landed look like it failed.
    void notifyAboutModeration(reviewId, status);

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error: any) {
    console.error("Moderate Review Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Tells the two people a moderation decision actually affects.
 *
 * Before this, both were left in silence: the reviewer never learned why a
 * rejection happened (the reason sat unread in a column) and the owner
 * never learned a review had appeared on their own listing.
 *
 * Runs after the status is already written, and swallows its own errors —
 * sendEmail() reports quiet failures on its own.
 */
async function notifyAboutModeration(reviewId: string, status: string) {
  try {
    const outcome =
      status === "published" ? "published"
      : status === "needs_changes" ? "needs_changes"
      : status === "rejected" ? "rejected"
      : null;
    if (!outcome) return; // 'approved'/'hidden' are internal states, not news

    const admin = createSupabaseAdminClient();
    const { data: review } = await admin
      .from("public_reviews")
      .select("id, user_id, business_id, public_title, public_body, public_rating, moderation_reason")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return;

    const { data: business } = await admin
      .from("businesses")
      .select("id, name, slug, plan, plan_until, created_by, owner_user_id")
      .eq("id", review.business_id)
      .maybeSingle();
    if (!business?.slug) return;

    // 1. The reviewer, on every outcome.
    const { data: reviewer } = await admin
      .from("profiles").select("email").eq("id", review.user_id).maybeSingle();
    if (reviewer?.email) {
      await sendEmail({
        to: reviewer.email,
        ...reviewModeratedEmail({
          businessName: business.name,
          businessSlug: business.slug,
          outcome,
          reason: review.moderation_reason,
        }),
      });
    }

    // 2. The business owner, only once the review is actually public.
    if (outcome !== "published") return;
    const ownerId = business.owner_user_id ?? business.created_by;
    if (!ownerId) return;
    const { data: owner } = await admin
      .from("profiles").select("email").eq("id", ownerId).maybeSingle();
    if (!owner?.email) return;

    await sendEmail({
      to: owner.email,
      ...newReviewEmail({
        businessName: business.name,
        businessSlug: business.slug,
        rating: review.public_rating ?? 5,
        title: review.public_title,
        body: review.public_body,
        // The mail should not invite a reply the plan does not allow.
        canReply: entitlementsFor(business).has("review_replies"),
      }),
    });
  } catch (err) {
    console.error("Notify About Moderation Error:", err);
  }
}

/**
 * پاسخ صاحب کسب‌وکار به یک نظر منتشرشده (فیچر پلن استارتر به بالا).
 *
 * No RLS policy grants a business owner UPDATE on public_reviews — only the
 * review's author or an admin. That's correct; this action is the gate
 * instead, and it checks two things a client payload could otherwise lie
 * about: that the review actually belongs to *this* user's business, and
 * that the business's plan currently includes "review_replies" (recomputed
 * from plan/plan_until, not read off the stored column — a lapsed
 * subscription loses the ability to reply, same as everywhere else).
 * `reply` of `null` clears an existing reply.
 */
export async function replyToReview(reviewId: string, reply: string | null) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const trimmed = reply?.trim() || null;
    if (trimmed && trimmed.length > 1000) {
      return { success: false, error: "پاسخ نباید بیشتر از ۱۰۰۰ کاراکتر باشد." };
    }

    const { data: review } = await supabase
      .from("public_reviews")
      .select("id, business_id, status")
      .eq("id", reviewId)
      .eq("status", "published")
      .maybeSingle();
    if (!review) return { success: false, error: "نظر یافت نشد." };

    const { data: business } = await supabase
      .from("businesses")
      .select("id, plan, plan_until, created_by")
      .eq("id", review.business_id)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    if (!entitlementsFor(business).has("review_replies")) {
      return { success: false, error: "پاسخ به نظرات فقط برای پلن استارتر به بالا فعال است." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("public_reviews")
      .update({ owner_reply: trimmed, owner_reply_at: trimmed ? new Date().toISOString() : null })
      .eq("id", reviewId);
    if (error) throw error;

    revalidatePath(`/businesses`, "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Reply To Review Error:", error);
    return { success: false, error: error.message };
  }
}

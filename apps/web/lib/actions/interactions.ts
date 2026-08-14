"use server";

// ============================================================================
// Source: lib/actions/interactions.ts
// Version: 1.0.0 — 2026-08-14
// Why: Server actions for User-Business Interactions (Save, Note, Rate, Review)
// Env / Identity: Server
// ============================================================================

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

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
}

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
    
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error: any) {
    console.error("Moderate Review Error:", error);
    return { success: false, error: error.message };
  }
}

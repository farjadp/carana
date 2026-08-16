"use server";

// ============================================================================
// Source: lib/actions/vanity-url.ts
// Version: 1.0.0 — 2026-08-16
// Why: Owner sets a custom English URL segment (Premium feature), resolved
//      publicly at /b/[slug] (app/b/[slug]/route.ts). Deliberately English-
//      slugged from day one — see the standing "all URLs must be English"
//      rule and the open-tasks item on the wider Persian-slug retrofit this
//      is not trying to solve.
// Env / Identity: Server-side, authenticated. Only the business's own owner
//      (created_by or owner_user_id) may set it. Uses the service role for
//      the write, same reason as every other plan-gated field: RLS does not
//      grant an owner UPDATE on a PUBLISHED row.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/entitlements";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function setVanitySlug(businessId: string, rawSlug: string | null) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: business } = await supabase
      .from("businesses")
      .select("id, slug, plan, plan_until, created_by, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!business || (business.created_by !== user.id && business.owner_user_id !== user.id)) {
      return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };
    }

    if (!entitlementsFor(business).has("vanity_url")) {
      return { success: false, error: "آدرس اختصاصی فقط برای پلن پریمیوم فعال است." };
    }

    // Clearing it is always allowed for an entitled owner.
    const slug = rawSlug?.trim().toLowerCase() || null;
    if (slug) {
      if (slug.length < 3 || slug.length > 60) {
        return { success: false, error: "آدرس باید بین ۳ تا ۶۰ کاراکتر باشد." };
      }
      if (!SLUG_RE.test(slug)) {
        return { success: false, error: "فقط حروف انگلیسی، عدد و خط تیره — بدون فاصله یا حرف فارسی. مثال: dr-ahmadi" };
      }
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("businesses").update({ vanity_slug: slug }).eq("id", businessId);
    if (error) {
      // Postgres unique_violation — the case-insensitive index on
      // vanity_slug caught a collision. Everything else is unexpected.
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "این آدرس قبلاً برای کسب‌وکار دیگری ثبت شده — یکی دیگر امتحان کن." };
      }
      throw error;
    }

    revalidatePath(`/dashboard/business/${businessId}/edit`);
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    if (slug) revalidatePath(`/b/${slug}`);
    return { success: true, slug };
  } catch (error: any) {
    console.error("Set Vanity Slug Error:", error);
    return { success: false, error: error.message };
  }
}

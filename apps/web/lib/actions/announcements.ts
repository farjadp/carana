"use server";

// ============================================================================
// Source: lib/actions/announcements.ts
// Version: 1.0.0 — 2026-08-16
// Why: Create/delete for business_announcements. No RLS policy grants a
//      regular user insert/update/delete on that table (see the migration) —
//      the quota (ANNOUNCEMENT_LIMITS, free 1 / Starter 3 / Premium
//      unlimited, per rolling 30 days) can only be enforced in application
//      code, so this file is where the actual gate lives, same shape as
//      gallery and busy_status.
// Env / Identity: Server-side, authenticated. Only the business's own
//      owner (created_by or owner_user_id) may post or remove one.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { sendEmail } from "@/lib/email/send";
import { newAnnouncementEmail } from "@/lib/email/templates";

const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

async function loadOwnedBusiness(businessId: string, userId: string) {
  const supabase = await createSupabaseActionClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan, plan_until, created_by, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business || (business.created_by !== userId && business.owner_user_id !== userId)) return null;
  return business;
}

export async function createAnnouncement(
  businessId: string,
  data: { title: string; body?: string; expiresInDays?: number | null }
) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const title = data.title.trim();
    if (!title) return { success: false, error: "عنوان اعلان را بنویس." };
    if (title.length > 120) return { success: false, error: "عنوان نباید بیشتر از ۱۲۰ کاراکتر باشد." };
    const body = data.body?.trim().slice(0, 500) || null;

    const business = await loadOwnedBusiness(businessId, user.id);
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    const limit = entitlementsFor(business).announcementLimit;
    if (limit !== null) {
      // Rolling 30 days, not "since the 1st of the calendar month" — an
      // evergreen window that never needs a reset job and never lets a
      // post on the 31st reset the count a day later.
      const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const { count } = await supabase
        .from("business_announcements")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", since);
      if ((count ?? 0) >= limit) {
        return { success: false, error: `به سقف ${limit} اعلان در ۳۰ روز رسیدی — برای بیشتر، پلن را ارتقا بده.` };
      }
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("business_announcements").insert({
      business_id: businessId,
      title,
      body,
      expires_at: data.expiresInDays ? new Date(Date.now() + data.expiresInDays * 86_400_000).toISOString() : null,
    });
    if (error) throw error;

    revalidatePath(`/dashboard/business/${businessId}/announcements`);
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);

    // Best-effort, never awaited past the point of blocking this action's
    // response — a slow or failed mail run must not make "انتشار اعلان"
    // hang or fail for the owner. Failures are swallowed here on purpose;
    // sendEmail() already reports quiet failures on its own.
    if (business.slug) {
      void notifyFollowers(admin, businessId, business.name, business.slug, title, body);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Create Announcement Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAnnouncement(announcementId: string, businessId: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const business = await loadOwnedBusiness(businessId, user.id);
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("business_announcements")
      .delete()
      .eq("id", announcementId)
      .eq("business_id", businessId); // belt and suspenders: id alone would be enough, this keeps it scoped
    if (error) throw error;

    revalidatePath(`/dashboard/business/${businessId}/announcements`);
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete Announcement Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Emails everyone who explicitly opted in to this business's announcements
 * (`notify_announcements = true` on their own saved-business row — never
 * inferred from "saved" alone, see the migration). Runs after the
 * announcement is already saved and never throws past that point: a mail
 * problem must not turn a successful post into a failed one for the owner.
 */
async function notifyFollowers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  businessId: string,
  businessName: string,
  businessSlug: string,
  title: string,
  body: string | null
) {
  try {
    const { data: followers } = await admin
      .from("user_business_interactions")
      .select("user_id")
      .eq("business_id", businessId)
      .eq("notify_announcements", true);
    if (!followers?.length) return;

    const { data: recipients } = await admin
      .from("profiles")
      .select("email")
      .in("id", followers.map((f) => f.user_id))
      .not("email", "is", null);

    const mail = newAnnouncementEmail({ businessName, businessSlug, title, body });
    await Promise.all((recipients ?? []).map((r) => sendEmail({ to: r.email as string, ...mail })));
  } catch (error) {
    console.error("Notify Followers Error:", error);
  }
}

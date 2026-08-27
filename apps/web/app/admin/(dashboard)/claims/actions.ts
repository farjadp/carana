// ============================================================================
// Source: app/admin/(dashboard)/claims/actions.ts
// Version: 1.0.0 — 2026-08-27
// Why: Decide a manual ownership claim. The SMS path in
//      lib/verification/actions.ts writes an already-approved row; a row that
//      is still `pending` is one no code ever proved, so approving it here is
//      a human vouching — recorded as method 'manual_review', never as
//      'sms_to_listed_number'.
// Env / Identity: Server actions, admin/moderator only. The ownership write
//      goes through the admin client because business_claims and businesses
//      are both RLS-guarded against the acting admin's own session.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { nextExpiry } from "@/lib/verification/status";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type Result = { success: boolean; error?: string; message?: string };

async function assertAdmin() {
  const supabase = await createSupabaseActionClient();
  return requireAdmin(supabase, ["admin", "moderator"]);
}

/**
 * Grant ownership to the claimant.
 *
 * Refuses if the listing gained a different owner while this claim sat in the
 * queue — the same re-check the SMS path makes between issuing and confirming
 * a code. Two admins reading the same stale queue must not both write.
 */
export async function approveClaim(claimId: string): Promise<Result> {
  let adminUser;
  try {
    adminUser = await assertAdmin();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "دسترسی ندارید." };
  }

  const admin = createSupabaseAdminClient();

  const { data: claim } = await admin
    .from("business_claims")
    .select("id, business_id, user_id, status")
    .eq("id", claimId)
    .maybeSingle();

  if (!claim) return { success: false, error: "درخواست یافت نشد." };
  if (claim.status !== "pending") {
    return { success: false, error: "این درخواست قبلاً تعیین تکلیف شده است." };
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id, slug, phone, owner_user_id")
    .eq("id", claim.business_id)
    .maybeSingle();

  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };
  if (business.owner_user_id && business.owner_user_id !== claim.user_id) {
    return { success: false, error: "مالکیت این کسب‌وکار در این فاصله به شخص دیگری داده شده است." };
  }

  const now = new Date();

  const { error: bizError } = await admin
    .from("businesses")
    .update({
      owner_user_id: claim.user_id,
      verification_method: "claimed",
      verified_at: now.toISOString(),
      verified_until: nextExpiry(now).toISOString(),
      verified_phone: business.phone,
      verified_email: null,
      verification_reminder_sent_at: null,
      verification_reminder_stage: null,
    })
    .eq("id", business.id);

  if (bizError) {
    console.error("Claim approval write failed:", bizError);
    return { success: false, error: "خطا در ثبت مالکیت." };
  }

  await admin.from("business_memberships").upsert(
    { business_id: business.id, user_id: claim.user_id, role: "owner" },
    { onConflict: "business_id,user_id" }
  );

  await admin
    .from("business_claims")
    .update({
      status: "approved",
      method: "manual_review",
      verified_at: now.toISOString(),
      verified_phone: business.phone,
      reviewed_by: adminUser.id,
      reviewed_at: now.toISOString(),
    })
    .eq("id", claim.id);

  revalidatePath("/admin/claims");
  revalidatePath(`/admin/claims/${claim.id}`);
  revalidatePath(`/businesses/${business.slug}`);

  return { success: true, message: "مالکیت ثبت شد." };
}

/**
 * Reject the claim. Deliberately touches nothing on `businesses`: a rejected
 * claim never granted anything, so there is nothing to take back.
 */
export async function rejectClaim(claimId: string, note?: string): Promise<Result> {
  let adminUser;
  try {
    adminUser = await assertAdmin();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "دسترسی ندارید." };
  }

  const admin = createSupabaseAdminClient();

  const { data: claim } = await admin
    .from("business_claims")
    .select("id, status, note")
    .eq("id", claimId)
    .maybeSingle();

  if (!claim) return { success: false, error: "درخواست یافت نشد." };
  if (claim.status !== "pending") {
    return { success: false, error: "این درخواست قبلاً تعیین تکلیف شده است." };
  }

  const reason = (note ?? "").trim();

  const { error } = await admin
    .from("business_claims")
    .update({
      status: "rejected",
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      // The claimant's own note is kept; the admin's reason is appended so the
      // row still explains itself months later.
      note: reason ? [claim.note, `رد شد: ${reason}`].filter(Boolean).join("\n") : claim.note,
    })
    .eq("id", claim.id);

  if (error) {
    console.error("Claim rejection write failed:", error);
    return { success: false, error: "خطا در ثبت رد درخواست." };
  }

  revalidatePath("/admin/claims");
  revalidatePath(`/admin/claims/${claim.id}`);

  return { success: true, message: "درخواست رد شد." };
}

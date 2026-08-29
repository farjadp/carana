// ============================================================================
// Source: app/admin/(dashboard)/listings/ownership-actions.ts
// Version: 1.0.0 — 2026-08-27
// Why: Let an admin hand a listing to a registered user directly.
//
//      /admin/claims could already approve ownership, but only *reactively*:
//      it needs a `business_claims` row the user filed themselves. When the
//      self-service path is the thing that is broken — the published number
//      no longer reaches them, the code never arrives, the listing was
//      imported with a number that was never theirs — there was no route at
//      all. This is that route.
//
//      Two rules it does not get to break:
//
//      1. **It is recorded, not silent.** Every assignment writes an approved
//         `business_claims` row with `method = 'manual_review'`, the acting
//         admin in `reviewed_by`, and the reason in `note`. It therefore
//         appears in the same queue as every user-filed claim rather than
//         being an invisible UPDATE, and «چه کسی این را داد» always has an
//         answer.
//      2. **The badge is a separate decision.** Assigning ownership and
//         granting the verified badge are two switches, because they are two
//         claims: one says who runs this listing, the other says a contact
//         point was proven. An admin vouching is a real proof of the second
//         only when they actually checked something, so it is opt-in and the
//         reason is required either way.
//
// Env / Identity: Server actions. Admin/moderator only — the same bar as
//      approving a claim, which performs the identical write. All reads and
//      writes go through the admin client: `businesses`, `profiles` and
//      `business_claims` are each RLS-guarded against the acting session.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { nextExpiry } from "@/lib/verification/status";

type Result = { success: boolean; error?: string; message?: string };

export type UserHit = { id: string; email: string | null; full_name: string | null };

async function assertAdmin() {
  const supabase = await createSupabaseActionClient();
  return requireAdmin(supabase, ["admin", "moderator"]);
}

/**
 * Find registered users by email or name.
 *
 * Admin-only, and deliberately not a "list everyone" endpoint: it answers a
 * query and caps the result, so the picker cannot be used to page through the
 * whole user table.
 */
export async function searchUsers(query: string): Promise<{ users: UserHit[]; error?: string }> {
  try {
    await assertAdmin();
  } catch {
    return { users: [], error: "دسترسی ندارید." };
  }

  const q = query.trim();
  if (q.length < 2) return { users: [] };

  const admin = createSupabaseAdminClient();
  // Escaped: a comma or parenthesis in the query would otherwise break out of
  // the or() grammar. `%` and `_` are ilike wildcards, harmless but confusing.
  const safe = q.replace(/[,()%_]/g, " ");
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`)
    .order("email")
    .limit(10);

  if (error) {
    console.error("admin user search failed:", error);
    return { users: [], error: "جستجوی کاربر ناموفق بود." };
  }
  return { users: (data ?? []) as UserHit[] };
}

/**
 * Give `businessId` to `userId`.
 *
 * @param grantBadge when true, also writes the verification columns exactly as
 *        an approved claim does — method 'claimed', six months, and the
 *        listing's own published phone frozen into `verified_phone` so the
 *        badge voids itself if that number is later edited away.
 */
export async function assignBusinessOwner(
  businessId: string,
  userId: string,
  reason: string,
  grantBadge: boolean,
): Promise<Result> {
  let adminUser;
  try {
    adminUser = await assertAdmin();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "دسترسی ندارید." };
  }

  const note = reason.trim();
  if (note.length < 3) {
    return { success: false, error: "دلیل واگذاری را بنویس — بدون آن ثبت نمی‌شود." };
  }

  const admin = createSupabaseAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, slug, name, phone, contact_email, owner_user_id, created_by")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };

  const { data: target } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { success: false, error: "این کاربر در پلازا حساب ندارد." };

  if (business.owner_user_id === userId) {
    return { success: false, error: "این کسب‌وکار همین حالا هم مال این کاربر است." };
  }

  const previousOwner = business.owner_user_id as string | null;
  const now = new Date();

  const patch: Record<string, unknown> = { owner_user_id: userId };
  if (grantBadge) {
    patch.verification_method = "claimed";
    patch.verified_at = now.toISOString();
    patch.verified_until = nextExpiry(now).toISOString();
    patch.verified_phone = business.phone;
    patch.verified_email = business.contact_email || null;
    patch.verification_reminder_sent_at = null;
    patch.verification_reminder_stage = null;
  }

  const { error: bizError } = await admin.from("businesses").update(patch).eq("id", business.id);
  if (bizError) {
    console.error("owner assignment write failed:", bizError);
    return { success: false, error: "ثبت مالکیت ناموفق بود." };
  }

  await admin.from("business_memberships").upsert(
    { business_id: business.id, user_id: userId, role: "owner" },
    { onConflict: "business_id,user_id" },
  );

  // The previous owner keeps no membership: they are not the owner any more,
  // and a stale «owner» membership row is what would put the listing back in
  // their dashboard after it was taken away from them.
  if (previousOwner && previousOwner !== userId) {
    await admin
      .from("business_memberships")
      .delete()
      .eq("business_id", business.id)
      .eq("user_id", previousOwner);
  }

  // The audit row. Written whether or not a badge was granted, so the queue
  // shows every hand-made ownership decision, not only the verified ones.
  //
  // upsert, not insert: business_claims carries `unique (business_id,
  // user_id)`, and the likeliest person to be handed a listing this way is
  // exactly the one who already tried and failed — so they already have a
  // row. An insert would have raised 23505 on the main case this feature
  // exists for. The SMS path upserts for the same reason.
  const { error: auditError } = await admin.from("business_claims").upsert(
    {
      business_id: business.id,
      user_id: userId,
      status: "approved",
      method: "manual_review",
      note: previousOwner
        ? `واگذاری دستی توسط ادمین (مالک قبلی: ${previousOwner}). ${note}`
        : `واگذاری دستی توسط ادمین. ${note}`,
      reviewed_by: adminUser.id,
      reviewed_at: now.toISOString(),
      verified_at: grantBadge ? now.toISOString() : null,
      verified_phone: grantBadge ? business.phone : null,
    },
    { onConflict: "business_id,user_id" },
  );

  // The ownership write already happened, so this is not a failure of the
  // action — but an unrecorded hand-made ownership change is the one thing
  // this action promised not to do, and saying "done" would hide it.
  if (auditError) {
    console.error("ownership audit row failed:", auditError);
    return {
      success: true,
      message:
        "مالکیت ثبت شد، اما ثبت آن در صف درخواست‌های مالکیت ناموفق بود — این واگذاری در سابقه دیده نمی‌شود.",
    };
  }

  revalidatePath(`/admin/listings/${business.id}`);
  revalidatePath("/admin/claims");
  revalidatePath("/dashboard/business");
  if (business.slug) revalidatePath(`/businesses/${business.slug}`);

  return {
    success: true,
    message: grantBadge
      ? `«${business.name}» به ${target.email ?? target.full_name ?? "این کاربر"} واگذار شد و نشان تأیید هم ثبت شد.`
      : `«${business.name}» به ${target.email ?? target.full_name ?? "این کاربر"} واگذار شد. نشان تأیید داده نشد.`,
  };
}

/** Take a listing back: clears the owner, the membership and the badge. */
export async function clearBusinessOwner(businessId: string, reason: string): Promise<Result> {
  let adminUser;
  try {
    adminUser = await assertAdmin();
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "دسترسی ندارید." };
  }

  const note = reason.trim();
  if (note.length < 3) return { success: false, error: "دلیل را بنویس." };

  const admin = createSupabaseAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id, slug, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return { success: false, error: "کسب‌وکار یافت نشد." };
  if (!business.owner_user_id) return { success: false, error: "این کسب‌وکار مالکی ندارد." };

  const previousOwner = business.owner_user_id as string;

  // The badge goes with the owner. A verified badge on a listing nobody owns
  // is a claim about a contact point with no one behind it.
  const { error } = await admin
    .from("businesses")
    .update({
      owner_user_id: null,
      verification_method: null,
      verified_at: null,
      verified_until: null,
      verified_phone: null,
      verified_email: null,
    })
    .eq("id", business.id);
  if (error) {
    console.error("owner clear failed:", error);
    return { success: false, error: "حذف مالکیت ناموفق بود." };
  }

  await admin
    .from("business_memberships")
    .delete()
    .eq("business_id", business.id)
    .eq("user_id", previousOwner);

  const { error: auditError } = await admin.from("business_claims").upsert(
    {
      business_id: business.id,
      user_id: previousOwner,
      status: "rejected",
      method: "manual_review",
      note: `سلب مالکیت دستی توسط ادمین. ${note}`,
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
      verified_at: null,
      verified_phone: null,
    },
    { onConflict: "business_id,user_id" },
  );
  if (auditError) console.error("ownership clear audit row failed:", auditError);

  revalidatePath(`/admin/listings/${business.id}`);
  revalidatePath("/admin/claims");
  if (business.slug) revalidatePath(`/businesses/${business.slug}`);
  return { success: true, message: "مالکیت و نشان تأیید برداشته شد." };
}

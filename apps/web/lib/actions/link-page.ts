"use server";

// ============================================================================
// Source: lib/actions/link-page.ts
// Version: 1.0.0 — 2026-08-25
// Why: Create, name and publish a GPLZ Link page — the first code that puts a
//      row in `link_pages`. Served at gplz.link/<handle>; see the Notion page
//      "GPLZ Link — link-in-bio (spec & decisions)".
//
//      THE WHOLE PITCH IS THAT THE PAGE ARRIVES FULL. Linktree hands you an
//      empty box; we already hold this business's phone, address, hours,
//      Instagram, menu and jobs. So `createLinkPageForBusiness` seeds the
//      mirror items itself and the owner's first screen is a finished page,
//      not a form. Time-to-value is meant to be about ten seconds.
//
//      A MIRROR ITEM IS SEEDED ONLY IF THE THING EXISTS. No phone row on a
//      business with no phone, no Instagram row without an Instagram. The
//      database already refuses to let a mirror item cache a URL
//      (link_items_mirror_has_no_copy), so what is stored is a pointer and
//      the live record answers at render time — a changed phone number
//      changes the page. Seeding an item for absent data would put a button
//      on screen that does nothing, which is the exact class of dishonesty
//      the house rule names.
//
//      SCOPE, DELIBERATELY: businesses only. The free tier is also meant to
//      be open to individuals with no listing, and `link_pages.business_id`
//      is nullable for exactly that. It is not built here because the abuse
//      defenses are a launch blocker for that tier (a phishing page on our
//      own domain gets gplz.link flagged, and every short link on the
//      platform dies with it). Business owners are already identified.
//
// Env / Identity: Server-side, authenticated. Writes go through the ACTION
//      client, not the admin client, so RLS is the enforcement rather than a
//      politeness — `link_pages` grants the owner insert/update directly, and
//      a trigger checks that a claimed business is really theirs. That is a
//      deliberate difference from vanity-url.ts and announcements.ts, which
//      need the service role because no policy grants what they do.
// ============================================================================

import { revalidatePath } from "next/cache";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import {
  bioUrlDisplay,
  fallbackHandle,
  hasLinkPro,
  linkLimitsFor,
  validateHandle,
  type BillingRow,
} from "@goplaza/core";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

/** Everything the entitlement and the seeding need, in one read. */
const BUSINESS_COLUMNS =
  "id, name, slug, ref_no, plan, plan_until, link_pro_until, created_by, owner_user_id, " +
  "phone, whatsapp, telegram, instagram, linkedin, website, contact_email, " +
  "google_maps_url, address, working_hours, booking_url, gallery_urls";

type BusinessRow = BillingRow & Record<string, unknown> & { id: string; name: string; slug: string | null; ref_no: number | null };

/**
 * The mirror items a business qualifies for, in the order they should appear.
 * Contact first — the reason most people open one of these pages is to call or
 * to find the place. Each entry names the column that must be non-empty for
 * the item to exist at all.
 */
const MIRROR_SEED: Array<{ kind: string; requires: keyof BusinessRow | string; free: boolean }> = [
  { kind: "phone", requires: "phone", free: true },
  { kind: "whatsapp", requires: "whatsapp", free: true },
  { kind: "directions", requires: "google_maps_url", free: true },
  { kind: "hours", requires: "working_hours", free: true },
  { kind: "instagram", requires: "instagram", free: false },
  { kind: "telegram", requires: "telegram", free: false },
  { kind: "website", requires: "website", free: false },
  { kind: "email", requires: "contact_email", free: false },
  { kind: "booking", requires: "booking_url", free: false },
  { kind: "gallery", requires: "gallery_urls", free: false },
];

function hasValue(row: BusinessRow, column: string): boolean {
  const v = row[column];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

async function loadOwnedBusiness(businessId: string, userId: string): Promise<BusinessRow | null> {
  const supabase = await createSupabaseActionClient();
  const { data } = await supabase.from("businesses").select(BUSINESS_COLUMNS).eq("id", businessId).maybeSingle();
  const business = data as BusinessRow | null;
  if (!business) return null;
  if (business.created_by !== userId && business.owner_user_id !== userId) return null;
  return business;
}

/**
 * Turn the link page on for a business. Idempotent: if one already exists it
 * is returned rather than a second being made. The paid tier allows more than
 * one page, but "enable" is not how a second one gets created — that is an
 * explicit act, not a side effect of pressing the same button twice.
 */
export async function createLinkPageForBusiness(businessId: string): Promise<Result<{ id: string; handle: string; url: string }>> {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const business = await loadOwnedBusiness(businessId, user.id);
    if (!business) return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };

    const { data: existing } = await supabase
      .from("link_pages")
      .select("id, handle")
      .eq("business_id", businessId)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return {
        success: true,
        data: { id: existing.id, handle: existing.handle, url: bioUrlDisplay(existing.handle) },
      };
    }

    if (business.ref_no == null) {
      // Assigned by a trigger on insert, so this should be unreachable. Say so
      // rather than inventing a handle that would not be stable.
      return { success: false, error: "این کسب‌وکار هنوز شماره‌ی مرجع ندارد. یک لحظه بعد دوباره امتحان کن." };
    }

    const handle = fallbackHandle(business.ref_no);

    const { data: page, error } = await supabase
      .from("link_pages")
      .insert({
        handle,
        owner_user_id: user.id,
        business_id: businessId,
        title: business.name,
        status: "draft",
      })
      .select("id, handle")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "این آدرس قبلاً گرفته شده. با پشتیبانی تماس بگیر." };
      }
      throw error;
    }

    const limits = linkLimitsFor(business);
    const items = MIRROR_SEED.filter((m) => (m.free || limits.richModules) && hasValue(business, m.requires)).map(
      (m, i) => ({ page_id: page.id, kind: m.kind, position: (i + 1) * 10 }),
    );

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("link_items").insert(items);
      // The page is real and usable without its seeded items; refusing to
      // return it would strand a row the owner cannot see. Report instead.
      if (itemsError) console.error("Link page seed items error:", itemsError);
    }

    revalidatePath(`/dashboard/business/${businessId}/edit`);
    return { success: true, data: { id: page.id, handle: page.handle, url: bioUrlDisplay(page.handle) } };
  } catch (error) {
    console.error("Create Link Page Error:", error);
    return { success: false, error: "ساخت صفحه‌ی لینک ناموفق بود." };
  }
}

/**
 * Choose a custom handle. Paid — this is the sharpest line in the packaging,
 * because nobody prints `gplz.link/g-4821` on a shop window.
 *
 * Availability is asked from the database, never guessed here: reserved names
 * and the 90-day cooldown after a release are state, and a copy of them in
 * application code goes stale the first time a route is added.
 */
export async function setLinkHandle(pageId: string, rawHandle: string): Promise<Result<{ handle: string; url: string }>> {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: page } = await supabase
      .from("link_pages")
      .select("id, handle, business_id, owner_user_id")
      .eq("id", pageId)
      .maybeSingle();
    if (!page || page.owner_user_id !== user.id) {
      return { success: false, error: "این صفحه متعلق به تو نیست." };
    }

    const billing = await billingRowFor(page.business_id, user.id);
    if (!hasLinkPro(billing)) {
      return { success: false, error: "انتخاب آدرس دلخواه فقط با «لینک حرفه‌ای» یا هر پلن پولی ممکن است." };
    }

    // validateHandle folds Persian digits before anything else — the app forces
    // RTL, so `کباب۲۲` arrives with digits no ASCII pattern matches.
    const check = validateHandle(rawHandle);
    if (!check.ok) return { success: false, error: check.message };

    if (check.handle === page.handle) return { success: true, data: { handle: page.handle, url: bioUrlDisplay(page.handle) } };

    const { data: available, error: rpcError } = await supabase.rpc("handle_available", { p_handle: check.handle });
    if (rpcError) throw rpcError;
    if (!available) {
      return { success: false, error: "این آدرس در دسترس نیست — گرفته شده، رزرو شده، یا به‌تازگی آزاد شده." };
    }

    const { error } = await supabase.from("link_pages").update({ handle: check.handle }).eq("id", pageId);
    if (error) {
      // handle_available and the update are two statements; someone else can
      // claim the name in between. The unique index is what actually decides.
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "همین الان کس دیگری این آدرس را گرفت. یکی دیگر امتحان کن." };
      }
      throw error;
    }

    if (page.business_id) revalidatePath(`/dashboard/business/${page.business_id}/edit`);
    return { success: true, data: { handle: check.handle, url: bioUrlDisplay(check.handle) } };
  } catch (error) {
    console.error("Set Link Handle Error:", error);
    return { success: false, error: "ثبت آدرس ناموفق بود." };
  }
}

/** Publish or unpublish. A draft page is invisible to the public — the RLS
 *  policy on `link_pages` only exposes `status = 'live'`, and for a page
 *  attached to a business, only while that business is itself published. */
export async function setLinkPageStatus(pageId: string, live: boolean): Promise<Result> {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: page } = await supabase
      .from("link_pages")
      .select("id, status, business_id, owner_user_id")
      .eq("id", pageId)
      .maybeSingle();
    if (!page || page.owner_user_id !== user.id) return { success: false, error: "این صفحه متعلق به تو نیست." };

    // A suspended page is not the owner's to reopen.
    if (page.status === "suspended") {
      return { success: false, error: "این صفحه تعلیق شده است. با پشتیبانی تماس بگیر." };
    }

    const { error } = await supabase
      .from("link_pages")
      .update({ status: live ? "live" : "draft", published_at: live ? new Date().toISOString() : null })
      .eq("id", pageId);
    if (error) throw error;

    if (page.business_id) revalidatePath(`/dashboard/business/${page.business_id}/edit`);
    return { success: true };
  } catch (error) {
    console.error("Set Link Page Status Error:", error);
    return { success: false, error: "تغییر وضعیت صفحه ناموفق بود." };
  }
}

/**
 * The billing row an entitlement question needs. A page attached to a business
 * inherits that business's plan; a page owned by a person on their own reads
 * their profile. Both carry `link_pro_until`, which is why `hasLinkPro` takes
 * the same shape for either.
 */
async function billingRowFor(businessId: string | null, userId: string): Promise<BillingRow | null> {
  const supabase = await createSupabaseActionClient();
  if (businessId) {
    const { data } = await supabase
      .from("businesses")
      .select("plan, plan_until, link_pro_until")
      .eq("id", businessId)
      .maybeSingle();
    return data as BillingRow | null;
  }
  const { data } = await supabase.from("profiles").select("link_pro_until").eq("id", userId).maybeSingle();
  return data as BillingRow | null;
}

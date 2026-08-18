// ============================================================================
// Source: packages/core/src/owner-identity.ts
// Version: 1.0.0 — 2026-08-17
// Why: One rule for "is there a person behind this listing, and may we name
//      them publicly?". The web profile, the mobile detail screen and the
//      owner's own dashboard preview must agree — they only agree if they
//      read this file. Same move verification-status, live-status, plans and
//      import-normalize already made.
// Env / Identity: Pure. No IO, safe on server, browser and Hermes.
// ============================================================================

/**
 * Which profile is the person behind a listing — or null when nobody is.
 *
 * The two routes mirror the two verification methods exactly:
 *   claimed        → `owner_user_id`, the account that proved control by SMS
 *   self_onboarded → `created_by`, the account that registered it
 *
 * An imported listing has `created_by = imports@charana.ca` and no
 * `owner_user_id`, so it returns null. That is the whole safety property:
 * we never name someone on a row nobody has claimed. `created_by` alone is
 * never enough — it is the *importer* on 5,600 rows.
 */
export function ownerProfileId(business: {
  owner_user_id?: string | null;
  created_by?: string | null;
  verification_method?: string | null;
}): string | null {
  if (business.owner_user_id) return business.owner_user_id;
  if (business.verification_method === "self_onboarded" && business.created_by) {
    return business.created_by;
  }
  return null;
}

export type PublicOwner = {
  /** Display name. Never rendered when empty — see `ownerSectionVisible`. */
  full_name: string | null;
  avatar_url: string | null;
  /** Profile creation date, shown as "با چارانا از …". */
  member_since: string | null;
};

/**
 * Should the public profile show the owner section?
 *
 * Four conditions, all required, and each one is a claim we can back:
 *   1. the verification is currently trusted (verified / expiring),
 *   2. a person is attached (see `ownerProfileId`),
 *   3. that person has a name to show,
 *   4. they have not hidden it.
 *
 * `hide_owner` is deliberately read without consulting the plan. Setting it
 * is a Premium action; honouring it is not, because the alternative is
 * republishing someone's name the day their card expires.
 */
export function ownerSectionVisible(args: {
  verificationTrusted: boolean;
  owner: PublicOwner | null;
  hide_owner?: boolean | null;
}): boolean {
  if (!args.verificationTrusted) return false;
  if (args.hide_owner) return false;
  return !!args.owner?.full_name?.trim();
}

/** Persian copy, kept next to the rule so the two cannot drift apart. */
export const OWNER_SECTION_TITLE = "صاحب کسب‌وکار";

export const OWNER_SECTION_NOTE: Record<"claimed" | "self_onboarded", string> = {
  claimed:
    "این شخص با دریافت کد پیامکی روی شماره‌ی همین آگهی، مالکیتش را اثبات کرده است.",
  self_onboarded:
    "این شخص خودش این کسب‌وکار را در چارانا ثبت کرده و ایمیل و شماره‌اش تایید شده است.",
};

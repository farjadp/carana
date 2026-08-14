// ============================================================================
// Source: apps/mobile/src/lib/interactions.ts
// Version: 1.0.0 — 2026-08-24
// Why: Saving, private notes, personal ratings and public reviews.
// Env / Identity: Anon client under the signed-in user's session. RLS restricts
//      every row here to its owner, and caps the status a review may be
//      submitted with — this file adds no authorization of its own.
// ============================================================================
import { supabase } from "./supabase";

export type PersonalStatus =
  | "none"
  | "saved"
  | "want_to_go"
  | "visited_liked"
  | "visited_neutral"
  | "visited_disliked"
  | "customer"
  | "recommended"
  | "follow_up_needed";

export type Interaction = {
  id: string;
  business_id: string;
  personal_status: PersonalStatus;
  personal_rating: number | null;
  private_title: string | null;
  private_note: string | null;
  visited_at: string | null;
  updated_at: string | null;
};

export type SavedBusiness = Interaction & {
  business: {
    id: string;
    slug: string | null;
    name: string;
    short_description: string | null;
    city: string | null;
    category: string | null;
    logo_url: string | null;
  } | null;
};

const INTERACTION_COLUMNS =
  "id, business_id, personal_status, personal_rating, private_title, private_note, visited_at, updated_at";

/** The statuses that mean "this is on my list". */
const SAVED_STATUSES: PersonalStatus[] = [
  "saved",
  "want_to_go",
  "visited_liked",
  "customer",
  "recommended",
  "follow_up_needed",
];

export async function getInteraction(businessId: string): Promise<Interaction | null> {
  const { data, error } = await supabase
    .from("user_business_interactions")
    .select(INTERACTION_COLUMNS)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as Interaction | null;
}

/**
 * One row per user per business, enforced by a unique constraint, so every
 * write is an upsert on that pair rather than an insert.
 */
export async function upsertInteraction(
  userId: string,
  businessId: string,
  patch: Partial<
    Pick<
      Interaction,
      "personal_status" | "personal_rating" | "private_title" | "private_note" | "visited_at"
    >
  >
): Promise<Interaction> {
  const { data, error } = await supabase
    .from("user_business_interactions")
    .upsert(
      { user_id: userId, business_id: businessId, ...patch },
      { onConflict: "user_id,business_id" }
    )
    .select(INTERACTION_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as Interaction;
}

export async function toggleSaved(
  userId: string,
  businessId: string,
  currentlySaved: boolean
) {
  return upsertInteraction(userId, businessId, {
    personal_status: currentlySaved ? "none" : "saved",
  });
}

export function isSaved(interaction: Interaction | null) {
  return !!interaction && SAVED_STATUSES.includes(interaction.personal_status);
}

export async function listSaved(): Promise<SavedBusiness[]> {
  const { data, error } = await supabase
    .from("user_business_interactions")
    .select(
      `${INTERACTION_COLUMNS},
       business:businesses(id, slug, name, short_description, city, category, logo_url)`
    )
    .in("personal_status", SAVED_STATUSES)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as SavedBusiness[];
}

export async function listMyNotes(): Promise<SavedBusiness[]> {
  const { data, error } = await supabase
    .from("user_business_interactions")
    .select(
      `${INTERACTION_COLUMNS},
       business:businesses(id, slug, name, short_description, city, category, logo_url)`
    )
    .not("private_note", "is", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as SavedBusiness[];
}

// ---------------------------------------------------------------------------
// Public reviews
// ---------------------------------------------------------------------------

export type PublicReview = {
  id: string;
  public_title: string | null;
  public_body: string;
  public_rating: number;
  display_identity: "real_name" | "display_name" | "anonymous";
  status: string;
  published_at: string | null;
  created_at: string | null;
  user_id: string;
};

export async function listPublishedReviews(businessId: string): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from("public_reviews")
    .select(
      "id, public_title, public_body, public_rating, display_identity, status, published_at, created_at, user_id"
    )
    .eq("business_id", businessId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PublicReview[];
}

export async function getMyReview(businessId: string): Promise<PublicReview | null> {
  const { data, error } = await supabase
    .from("public_reviews")
    .select(
      "id, public_title, public_body, public_rating, display_identity, status, published_at, created_at, user_id"
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as PublicReview | null;
}

/**
 * Reviews are submitted for moderation, never published directly — RLS rejects
 * any other status on insert, so the value here is not a formality.
 */
export async function submitReview(
  userId: string,
  businessId: string,
  input: {
    body: string;
    rating: number;
    title?: string;
    displayIdentity: PublicReview["display_identity"];
  }
) {
  const { data, error } = await supabase
    .from("public_reviews")
    .insert({
      user_id: userId,
      business_id: businessId,
      public_body: input.body,
      public_rating: input.rating,
      public_title: input.title || null,
      display_identity: input.displayIdentity,
      status: "pending_moderation",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Source: app/businesses/[slug]/page.tsx
// Version: 3.0.0 — 2026-08-15
// Why: Robust business detail page query with URL decoding, slug/name/id fallback.
//      v3 also resolves the category label + image so the profile never shows a raw slug.
// Env / Identity: Server Component.
// ============================================================================

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/page-shell";
import BusinessProfileClient from "./business-profile-client";

export const revalidate = 60; // ISR cache 1 minute

// Columns safe to render on a public profile. `select("*")` also returned the
// verification fields (business_number, license_info, verification_documents,
// verification_notes), which are admin-only and must never reach the client.
const PUBLIC_BUSINESS_COLUMNS = `
  id, slug, name, name_en, category, sub_category, tagline,
  short_description, description, established_year,
  country, province, city, address, postal_code, is_address_public,
  service_type, service_area, google_maps_url,
  phone, whatsapp, contact_email, website, instagram, telegram, linkedin,
  preferred_contact, languages, is_iranian_owned,
  logo_url, cover_url, brand_color,
  working_hours, accepts_appointments, booking_url,
  services, branches, status, created_by, created_at, updated_at,
  owner_user_id, verification_method, verified_at, verified_until,
  verified_phone, verified_email
`;

async function fetchBusinessRecord(slugParam: string) {
  const decodedSlug = decodeURIComponent(slugParam);
  const supabase = await createSupabaseServerClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);

  // Always go through the request-scoped client so RLS decides what this
  // visitor may see. The previous admin-client fallback bypassed RLS entirely
  // and exposed DRAFT / SUBMITTED / REJECTED listings to the public.
  if (isUuid) {
    const { data } = await supabase
      .from("businesses")
      .select(PUBLIC_BUSINESS_COLUMNS)
      .eq("id", decodedSlug)
      .maybeSingle();
    return data;
  }

  // eq() parameterises the value, unlike or() which builds a filter string and
  // let a crafted slug inject extra PostgREST conditions.
  const { data: bySlug } = await supabase
    .from("businesses")
    .select(PUBLIC_BUSINESS_COLUMNS)
    .eq("slug", decodedSlug)
    .maybeSingle();

  if (bySlug) return bySlug;

  const { data: byName } = await supabase
    .from("businesses")
    .select(PUBLIC_BUSINESS_COLUMNS)
    .eq("name", decodedSlug)
    .maybeSingle();

  return byName;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const business = await fetchBusinessRecord(rawSlug);

  if (!business) {
    return {
      title: "کسب‌وکار یافت نشد",
    };
  }

  return {
    title: `${business.name} (${business.city || "کانادا"})`,
    description: business.short_description || `اطلاعات تماس و مشخصات ${business.name} در دایرکتوری ایرانیان کانادا`,
    openGraph: {
      title: `${business.name} | دایرکتوری مشاغل ایرانیان کانادا`,
      description: business.short_description || business.name,
      images: business.cover_url ? [business.cover_url] : [],
    },
  };
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const business = await fetchBusinessRecord(rawSlug);

  if (!business) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if current logged in user is owner or admin
  let isOwnerOrAdmin = false;
  if (user) {
    // `created_by` is the only ownership column in the schema; the previous
    // owner_id / owner_user_id checks referenced columns that never existed.
    if (business.created_by === user.id) {
      isOwnerOrAdmin = true;
    } else {
      const adminClient = createSupabaseAdminClient();
      const { data: profile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile && (profile.role === "admin" || profile.role === "moderator")) {
        isOwnerOrAdmin = true;
      }
    }
  }

  // Fetch this user's own interaction record (private notes, saved state).
  // The table is `user_business_interactions`; the previous `user_interactions`
  // does not exist, so this silently returned nothing.
  let initialInteraction = null;
  if (user) {
    const { data: interaction } = await supabase
      .from("user_business_interactions")
      .select("*")
      .eq("business_id", business.id)
      .eq("user_id", user.id)
      .maybeSingle();

    initialInteraction = interaction ?? null;
  }

  // Public reviews live in `public_reviews`, not on the interaction row, and
  // are only visible once moderation has set status = 'published'.
  const { data: reviewsData } = await supabase
    .from("public_reviews")
    .select("id, public_title, public_body, public_rating, display_identity, published_at, created_at, user_id")
    .eq("business_id", business.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Resolve display names only for reviewers who did not post anonymously.
  const namedReviewerIds = (reviewsData ?? [])
    .filter((r) => r.display_identity !== "anonymous")
    .map((r) => r.user_id);

  const reviewerNames = new Map<string, string>();
  if (namedReviewerIds.length > 0) {
    const adminClient = createSupabaseAdminClient();
    const { data: reviewers } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", namedReviewerIds);

    for (const reviewer of reviewers ?? []) {
      if (reviewer.full_name) reviewerNames.set(reviewer.id, reviewer.full_name);
    }
  }

  const approvedReviews = (reviewsData ?? []).map((r) => ({
    id: r.id,
    rating: r.public_rating ?? 5,
    title: r.public_title,
    content: r.public_body,
    created_at: r.published_at ?? r.created_at,
    user_name:
      r.display_identity === "anonymous"
        ? "کاربر ناشناس"
        : reviewerNames.get(r.user_id) ?? "کاربر چارانا",
  }));

  // Similar businesses: same category or same city. Built with separate eq()
  // queries rather than an interpolated or() filter, because category and city
  // are owner-supplied values that would otherwise land inside a filter string.
  const [{ data: sameCategory }, { data: sameCity }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, slug, name, category, city, province, cover_url")
      .eq("category", business.category)
      .neq("id", business.id)
      .limit(4),
    supabase
      .from("businesses")
      .select("id, slug, name, category, city, province, cover_url")
      .eq("city", business.city)
      .neq("id", business.id)
      .limit(4),
  ]);

  // Category label + hero image (the profile used to print the raw slug).
  const { data: categoryRow } = await supabase
    .from("categories")
    .select("slug, name, image_url")
    .eq("slug", business.category)
    .maybeSingle();

  const seen = new Set<string>();
  const similarBusinesses = [...(sameCategory ?? []), ...(sameCity ?? [])]
    .filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    })
    .slice(0, 4);

  return (
    <PageShell currentPath={`/businesses/${rawSlug}`} currentSection="business">
      <BusinessProfileClient
        business={business}
        category={categoryRow ?? null}
        user={user}
        initialInteraction={initialInteraction}
        approvedReviews={approvedReviews}
        similarBusinesses={similarBusinesses || []}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />
    </PageShell>
  );
}

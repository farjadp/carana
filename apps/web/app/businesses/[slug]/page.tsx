// ============================================================================
// Source: app/businesses/[slug]/page.tsx
// Version: 3.1.0 — 2026-08-17
// Why: Robust business detail page query with URL decoding, slug/name/id fallback.
//      v3 also resolves the category label + image so the profile never shows a raw slug.
//      v3.1 resolves the owner of a verified listing for the public "owner"
//      section, and does not fetch that profile at all when it is hidden.
// Env / Identity: Server Component.
// ============================================================================

import { Metadata } from "next";
import { notFound } from "next/navigation";

import { listingOgImage } from "@/lib/seo/entity";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/page-shell";
import BusinessProfileClient from "./business-profile-client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd, localBusinessLd } from "@/lib/seo/local";
import { getCategoryDetail } from "@/lib/data/category-details";
import { cityNameFa, getGeoIndex } from "@/lib/seo/geo-index";
import { businessDescription, businessTitle } from "@/lib/seo/titles";
import { getVerificationStatus, isTrusted } from "@/lib/verification/status";
import { BusinessPosts } from "@/components/blog/business-posts";
import { entitlementsFor, ownerProfileId, ownerSectionVisible, type PlanId, type PublicOwner } from "@goplaza/core";
import { ProfileUpsellBanner } from "@/components/business/profile-upsell-banner";

export const revalidate = 60; // ISR cache 1 minute

// Columns safe to render on a public profile. `select("*")` also returned the
// verification fields (business_number, license_info, verification_documents,
// verification_notes), which are admin-only and must never reach the client.
const PUBLIC_BUSINESS_COLUMNS = `
  id, ref_no, slug, name, name_en, category, sub_category, tagline,
  short_description, description, established_year,
  country, province, city, address, postal_code, is_address_public,
  service_type, service_area, google_maps_url,
  phone, whatsapp, contact_email, website, instagram, telegram, linkedin,
  preferred_contact, languages, is_iranian_owned,
  logo_url, cover_url, brand_color,
  working_hours, accepts_appointments, booking_url,
  services, branches, status, created_by, created_at, updated_at,
  owner_user_id, verification_method, verified_at, verified_until,
  verified_phone, verified_email, gallery_urls, gallery_video_url,
  plan, plan_until, busy_status, busy_status_until, hide_owner
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

  // The category word and «ایرانی» are what people actually type; the old
  // title carried neither, and put the city in Latin against a Persian query.
  // Formulas live in lib/seo/titles.ts (docs/12-seo-architecture.md §6).
  const cityFa = cityNameFa(await getGeoIndex(), business.city);
  const categoryName = business.category ? getCategoryDetail(business.category)?.name ?? null : null;

  const title = businessTitle({
    name: business.name,
    categorySlug: business.category,
    categoryName,
    cityFa,
  });
  const description = businessDescription({
    name: business.name,
    categorySlug: business.category,
    categoryName,
    cityFa,
    shortDescription: business.short_description,
    hasPhone: Boolean(business.phone),
    hasAddress: Boolean(business.address) && business.is_address_public !== false,
  });

  return {
    // The layout template appends "| GOPLAZA"; these titles carry their own
    // Persian brand suffix and a budget that assumes nothing else is added.
    title: { absolute: title },
    description,
    // The vanity URL /b/[slug] 301s here, so this is the only citable URL.
    alternates: { canonical: `/businesses/${encodeURIComponent(business.slug ?? rawSlug)}` },
    openGraph: {
      locale: "fa_CA",
      type: "profile",
      title,
      description,
      // Was `cover_url || OG_FALLBACK`, and cover_url is empty on every
      // imported row — one shared image for the whole directory. listingOgImage
      // uses a real upload when there is one and keeps the fallback otherwise;
      // see why logo_url cannot be trusted on its own.
      images: [listingOgImage(business)],
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
    // Two routes to ownership: `created_by` (registered it through onboarding)
    // and `owner_user_id` (claimed a listing an admin originally imported).
    // Checking created_by alone — as this did until 16 Aug — silently hid
    // owner-only controls (review replies, the busy-status toggle's
    // upstream entitlement) from every claimed business's real owner.
    if (business.created_by === user.id || business.owner_user_id === user.id) {
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

  // The person behind the listing, for the public "صاحب کسب‌وکار" section.
  //
  // Resolved and gated entirely on the server, and only fetched when it will
  // actually be shown — a name that must not be published should not travel
  // to the browser at all, where "hidden" would only be a missing element in
  // a payload anyone can read. `ownerSectionVisible` re-checks the same
  // conditions afterwards for the name-is-empty case.
  const verificationTrusted = isTrusted(getVerificationStatus(business));
  const ownerId = business.hide_owner || !verificationTrusted ? null : ownerProfileId(business);

  let publicOwner: PublicOwner | null = null;
  if (ownerId) {
    const adminClient = createSupabaseAdminClient();
    // Name, picture and join date only. Email, phone and role stay server-side.
    const { data: ownerProfile } = await adminClient
      .from("profiles")
      .select("full_name, avatar_url, created_at")
      .eq("id", ownerId)
      .maybeSingle();

    if (ownerProfile) {
      publicOwner = {
        full_name: ownerProfile.full_name,
        avatar_url: ownerProfile.avatar_url,
        member_since: ownerProfile.created_at,
      };
    }
  }

  const showOwner = ownerSectionVisible({
    verificationTrusted,
    owner: publicOwner,
    hide_owner: business.hide_owner,
  });

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

  // Active announcements — expired ones stay in the table (the owner's
  // history) but never render publicly.
  const nowIso = new Date().toISOString();
  const { data: announcements } = await supabase
    .from("business_announcements")
    .select("id, title, body, expires_at, created_at")
    .eq("business_id", business.id)
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(5);

  // Live hiring ads. The same rule as everywhere else — published, not
  // closed, not expired — evaluated here rather than trusted from a status.
  // No row means the section is absent entirely; an empty «فرصت‌های شغلی»
  // heading would be a promise the page cannot keep.
  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, slug, title, employment_type, workplace_type, city, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english")
    .eq("business_id", business.id)
    .eq("status", "published")
    .is("closed_at", null)
    .gt("expires_at", nowIso)
    .order("published_at", { ascending: false })
    .limit(10);

  // Public reviews live in `public_reviews`, not on the interaction row, and
  // are only visible once moderation has set status = 'published'.
  const { data: reviewsData } = await supabase
    .from("public_reviews")
    .select("id, public_title, public_body, public_rating, display_identity, published_at, created_at, user_id, owner_reply, owner_reply_at")
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
        : reviewerNames.get(r.user_id) ?? "کاربر گوپلازا",
    owner_reply: r.owner_reply,
    owner_reply_at: r.owner_reply_at,
  }));

  // What the plan actually unlocks right now — never `business.plan`, which
  // ignores an expired paid period (see entitlements.ts). Two separate
  // entitlements: Premium clears the rival listings from the foot of its own
  // profile, Platinum clears the articles as well.
  const ent = entitlementsFor(business);
  const hideRivals = ent.has("clean_profile");
  const hideArticles = ent.has("exclusive_profile");

  // Similar businesses: same category or same city. Built with separate eq()
  // queries rather than an interpolated or() filter, because category and city
  // are owner-supplied values that would otherwise land inside a filter string.
  // Skipped outright on a paid profile — two queries whose only possible use
  // would be to render something this listing paid to remove.
  const [{ data: sameCategory }, { data: sameCity }] = hideRivals
    ? [{ data: [] as any[] }, { data: [] as any[] }]
    : await Promise.all([
        supabase
          .from("businesses")
          .select("id, slug, name, category, city, province, cover_url, logo_url")
          .eq("category", business.category)
          .neq("id", business.id)
          .limit(4),
        supabase
          .from("businesses")
          .select("id, slug, name, category, city, province, cover_url, logo_url")
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

  // The Persian name of the city, for the copy the reader sees. The page was
  // already computing this for its <title> and printing the raw Latin value
  // ("کسب‌وکارهای مشابه در Toronto") in the body.
  const cityFa = cityNameFa(await getGeoIndex(), business.city);

  const seen = new Set<string>();
  const geo = await getGeoIndex();
  const similarBusinesses = [...(sameCategory ?? []), ...(sameCity ?? [])]
    .filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    })
    .slice(0, 4)
    // Each card prints its own city, so each needs its own Persian name.
    .map((b) => ({ ...b, city_fa: cityNameFa(geo, b.city) }));

  return (
    <PageShell currentPath={`/businesses/${rawSlug}`} currentSection="business">
      <JsonLd
        data={[
          localBusinessLd(business as never, categoryRow?.name ?? null),
          breadcrumbLd([
            { name: "خانه", url: "/" },
            ...(categoryRow ? [{ name: categoryRow.name as string, url: `/categories/${categoryRow.slug}` }] : []),
            { name: business.name, url: `/businesses/${rawSlug}` },
          ]),
        ]}
      />
      <BusinessProfileClient
        business={business}
        category={categoryRow ?? null}
        user={user}
        initialInteraction={initialInteraction}
        approvedReviews={approvedReviews}
        announcements={announcements ?? []}
        jobs={jobs ?? []}
        similarBusinesses={similarBusinesses || []}
        cityFa={cityFa}
        isOwnerOrAdmin={isOwnerOrAdmin}
        publicOwner={showOwner ? publicOwner : null}
      />
      {/* Three articles chosen for THIS business — a different trio per
          profile, seeded by its id. Absent when nothing is published, and
          headed «مقالات مرتبط» only when something actually matched; the
          component decides, not this page. Platinum takes these away too. */}
      {hideArticles ? null : (
        <BusinessPosts
          businessId={business.id}
          city={business.city}
          cityFa={cityFa}
          categorySlug={business.category}
          categoryName={(categoryRow?.name as string) ?? null}
        />
      )}

      {/* The banner explains the emptiness it sits in. Only ever rendered when
          something really was removed, so it can never claim a plan the row
          does not hold. */}
      {hideRivals ? (
        <ProfileUpsellBanner
          plan={ent.plan as Extract<PlanId, "featured" | "platinum">}
          businessName={business.name}
          isOwnerOrAdmin={isOwnerOrAdmin}
        />
      ) : null}
    </PageShell>
  );
}

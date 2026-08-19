// ============================================================================
// Source: app/llms-full.txt/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: llms-full.txt — every public listing, one line each, so an answer
//      engine can cite a specific business with its city and category. Only
//      public columns; never address unless the owner made it public.
// Env / Identity: Public. Anon client. Cached an hour.
// ============================================================================
import { PUBLIC_STATUSES } from "@goplaza/core";

import { getCategoryDetail } from "@/lib/data/category-details";
import { SITE } from "@/lib/seo/local";
import { getVerificationStatus, isTrusted } from "@/lib/verification/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

export const revalidate = 3600;

/** Only the columns this export is allowed to read. */
type ExportRow = {
  slug: string | null;
  name: string;
  name_en: string | null;
  category: string | null;
  sub_category: string | null;
  city: string | null;
  province: string | null;
  tagline: string | null;
  short_description: string | null;
  website: string | null;
  address: string | null;
  is_address_public: boolean | null;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  // .limit(5000) used to be here and did nothing: the server's max-rows wins,
  // so this "full export" was shipping 1,000 of 5,120 listings.
  const data = await fetchAllRows<ExportRow>(() =>
    supabase
      .from("businesses")
      .select("slug, name, name_en, category, sub_category, city, province, tagline, short_description, website, verified_until, verified_phone, verified_email, verification_method, verified_at, phone, contact_email, address, is_address_public")
      .in("status", PUBLIC_STATUSES)
      .order("city")
  );

  const lines = data.map((b) => {
    const cat = b.category ? getCategoryDetail(b.category).name : "";
    const v = isTrusted(getVerificationStatus(b as never)) ? "verified" : "unverified";
    const desc = (b.tagline || b.short_description || "").replace(/\s+/g, " ").slice(0, 160);
    const addr = b.is_address_public && b.address ? ` · ${b.address}` : "";
    return `- ${b.name}${b.name_en ? ` (${b.name_en})` : ""} — ${cat}${b.sub_category ? ` / ${b.sub_category}` : ""} — ${b.city ?? ""}${b.province ? `, ${b.province}` : ""}${addr} — ${v} — ${SITE}/businesses/${b.slug}${desc ? ` — ${desc}` : ""}`;
  });

  const body = `# GOPLAZA — full listing export for AI readers
# Generated ${new Date().toISOString()} · ${lines.length} public listings · see ${SITE}/llms.txt
# Format: name — category — city, province — verification — url — one-line description

${lines.join("\n")}
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

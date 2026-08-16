// ============================================================================
// Source: app/admin/(dashboard)/cleanup/cities/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The missing-city cleanup queue. 409 listings carry city "نامشخص", so
//      no city filter, city page or city × category page can see them. They
//      have no address and no postal code — the phone area code is the only
//      signal, and it is only conclusive for some codes.
// Env / Identity: Admin only.
// ============================================================================
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupAreaCode } from "@/lib/data/area-codes";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { CityCleanupClient, type CleanupRow } from "./cities-client";

export const metadata = { title: "شهرهای نامشخص | پنل مدیریت" };
export const dynamic = "force-dynamic";

const UNKNOWN = "نامشخص";

export default async function CityCleanupPage() {
  const supabase = await createSupabaseActionClient();
  try {
    await requireAdmin(supabase);
  } catch {
    redirect("/admin/login");
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("id, name, slug, phone, province, category, website, address, city_source, status")
    .eq("city", UNKNOWN)
    .order("created_at", { ascending: false })
    .limit(600);

  const rows: CleanupRow[] = (data ?? []).map((b) => {
    const hit = lookupAreaCode(b.phone as string | null);
    return {
      id: b.id as string,
      name: (b.name as string) ?? "",
      slug: (b.slug as string) ?? null,
      phone: (b.phone as string) ?? null,
      province: (b.province as string) ?? null,
      category: (b.category as string) ?? null,
      website: (b.website as string) ?? null,
      address: (b.address as string) ?? null,
      handled: b.city_source === "admin",
      areaCode: hit?.code ?? null,
      region: hit?.region ?? null,
      suggestion: hit?.city ?? null,
      confidence: hit?.confidence ?? null,
      candidates: hit?.candidates ?? [],
    };
  });

  return <CityCleanupClient rows={rows} />;
}

// ============================================================================
// Source: app/admin/(dashboard)/cleanup/cities/actions.ts
// Version: 1.0.0 — 2026-08-16
// Why: Fix the 409 listings whose city is "نامشخص". Every write records
//      city_source, so a phone-derived guess is never mistaken later for
//      something the owner said.
// Env / Identity: Admin only.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { lookupAreaCode } from "@/lib/data/area-codes";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

const UNKNOWN = "نامشخص";

async function guard() {
  const supabase = await createSupabaseActionClient();
  await requireAdmin(supabase);
  return createSupabaseAdminClient();
}

function revalidateAll() {
  revalidatePath("/admin/cleanup/cities");
  revalidatePath("/cities");
  revalidatePath("/sitemap.xml");
}

export async function setCity(businessId: string, city: string, source: "admin" | "area_code" = "admin") {
  const admin = await guard();
  const value = city.trim();
  if (!value) return { success: false, error: "شهر خالی است." };
  const { error } = await admin.from("businesses").update({ city: value, city_source: source }).eq("id", businessId);
  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true };
}

export async function skipBusiness(businessId: string) {
  // "Not resolvable" — keep it unknown but stop showing it at the top by
  // marking the source, so the queue can filter it out.
  const admin = await guard();
  const { error } = await admin.from("businesses").update({ city_source: "admin" }).eq("id", businessId);
  if (error) return { success: false, error: error.message };
  revalidateAll();
  return { success: true };
}

/**
 * Apply only the codes that name a single city (416/647/437 → Toronto,
 * 613 → Ottawa, …). Region-only codes such as 905 are left for a human,
 * because putting a Richmond Hill business in "Toronto" would make the city
 * page assert something false.
 */
export async function applyHighConfidence() {
  const admin = await guard();
  const { data, error } = await admin.from("businesses").select("id, phone").eq("city", UNKNOWN);
  if (error) return { success: false, error: error.message, updated: 0 };

  const byCity = new Map<string, string[]>();
  for (const b of data ?? []) {
    const hit = lookupAreaCode(b.phone as string | null);
    if (!hit || hit.confidence !== "city" || !hit.city) continue;
    const list = byCity.get(hit.city) ?? [];
    list.push(b.id as string);
    byCity.set(hit.city, list);
  }

  let updated = 0;
  for (const [city, ids] of byCity) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error: upErr } = await admin.from("businesses").update({ city, city_source: "area_code" }).in("id", chunk);
      if (upErr) return { success: false, error: upErr.message, updated };
      updated += chunk.length;
    }
  }
  revalidateAll();
  return { success: true, updated };
}

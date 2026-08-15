// ============================================================================
// Source: apps/mobile/src/lib/businesses.ts
// Version: 2.0.0 — 2026-08-22
// Why: Directory queries for the mobile app.
// Env / Identity: Anon client. RLS decides what comes back — this file adds no
//      authorization of its own and must not be trusted to.
// ============================================================================
import { PUBLIC_STATUSES, resolveProvince, type Province } from "@charana/core";

import { supabase } from "./supabase";

/**
 * Columns safe to show publicly.
 *
 * Postgres does not apply RLS per column, so `select("*")` would also return
 * business_number, license_info and the verification fields. Always list
 * columns explicitly on a public query.
 */
const CARD_COLUMNS =
  "id, ref_no, slug, name, name_en, category, sub_category, tagline, short_description, city, province, phone, website, logo_url, cover_url";

const DETAIL_COLUMNS = `${CARD_COLUMNS}, description, address, is_address_public,
  whatsapp, contact_email, instagram, telegram, linkedin, google_maps_url,
  preferred_contact, languages, is_iranian_owned, established_year,
  working_hours, accepts_appointments, booking_url, services, branches,
  service_type, service_area, brand_color, created_at,
  verification_method, verified_at, verified_until, verified_phone, verified_email`;

export type BusinessCard = {
  id: string;
  ref_no: number | null;
  slug: string | null;
  name: string;
  name_en: string | null;
  category: string | null;
  sub_category: string | null;
  tagline: string | null;
  short_description: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

export type BusinessDetail = BusinessCard & {
  description: string | null;
  address: string | null;
  is_address_public: boolean | null;
  whatsapp: string | null;
  contact_email: string | null;
  instagram: string | null;
  telegram: string | null;
  linkedin: string | null;
  google_maps_url: string | null;
  preferred_contact: string | null;
  languages: string[] | null;
  is_iranian_owned: boolean | null;
  established_year: number | null;
  working_hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  accepts_appointments: boolean | null;
  booking_url: string | null;
  services: { name: string; description?: string; price?: string; price_unit?: string }[] | null;
  branches: { name?: string; address: string; city?: string; phone?: string }[] | null;
  service_type: string | null;
  service_area: string | null;
  brand_color: string | null;
  created_at: string | null;
  verification_method: "self_onboarded" | "claimed" | null;
  verified_at: string | null;
  verified_until: string | null;
  verified_phone: string | null;
  verified_email: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, image_url, description")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

/** Counts per category, for the badges on the home screen. */
export async function countByCategory(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("businesses")
    .select("category")
    .in("status", PUBLIC_STATUSES);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = (row as { category: string | null }).category;
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export async function listCities(): Promise<{ city: string; count: number }[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("city")
    .in("status", PUBLIC_STATUSES)
    .not("city", "is", null);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const city = (row as { city: string | null }).city;
    if (!city || city === "نامشخص") continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listBusinesses(options?: {
  city?: string;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<BusinessCard[]> {
  let query = supabase
    .from("businesses")
    .select(CARD_COLUMNS)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 40);

  if (options?.city) query = query.eq("city", options.city);
  if (options?.category) query = query.eq("category", options.category);

  // ilike escapes its argument, unlike a hand-built or() filter string.
  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(
      `name.ilike.${term},name_en.ilike.${term},short_description.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BusinessCard[];
}

export async function getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as BusinessDetail | null;
}

// ---------------------------------------------------------------------------
// Geography: province → city
// ---------------------------------------------------------------------------
const UNKNOWN_CITY = "نامشخص";

export type ProvinceSummary = {
  province: Province;
  total: number;
  cities: { city: string; count: number }[];
};

/**
 * One query, rolled up in memory. The table is small enough that a round trip
 * per province would cost more than fetching the two columns outright.
 */
export async function listProvinces(): Promise<ProvinceSummary[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("province, city")
    .in("status", PUBLIC_STATUSES);

  if (error) throw error;

  const byProvince = new Map<string, ProvinceSummary>();

  for (const row of (data ?? []) as { province: string | null; city: string | null }[]) {
    const province = resolveProvince(row.province);
    if (!province) continue;

    let entry = byProvince.get(province.slug);
    if (!entry) {
      entry = { province, total: 0, cities: [] };
      byProvince.set(province.slug, entry);
    }
    entry.total += 1;

    if (row.city && row.city !== UNKNOWN_CITY) {
      const found = entry.cities.find((c) => c.city === row.city);
      if (found) found.count += 1;
      else entry.cities.push({ city: row.city, count: 1 });
    }
  }

  for (const entry of byProvince.values()) {
    entry.cities.sort((a, b) => b.count - a.count);
  }

  return [...byProvince.values()].sort((a, b) => b.total - a.total);
}

export async function listBusinessesByProvince(provinceNameEn: string, limit = 60) {
  const { data, error } = await supabase
    .from("businesses")
    .select(CARD_COLUMNS)
    .eq("province", provinceNameEn)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as BusinessCard[];
}

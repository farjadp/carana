// ============================================================================
// Source: apps/mobile/src/lib/businesses.ts
// Version: 1.0.0 — 2026-08-21
// Why: Directory queries for the mobile app.
// Env / Identity: Anon client. RLS decides what comes back — this file adds no
//      authorization of its own and must not be trusted to.
// ============================================================================
import { PUBLIC_STATUSES } from "@charana/core";

import { supabase } from "./supabase";

/**
 * Columns safe to show publicly.
 *
 * Postgres does not apply RLS per column, so `select("*")` would happily return
 * business_number, license_info and the verification fields. Always list
 * columns explicitly on a public query.
 */
const PUBLIC_COLUMNS =
  "id, slug, name, name_en, category, sub_category, tagline, short_description, city, province, phone, website, logo_url, cover_url, status";

export type DirectoryBusiness = {
  id: string;
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

export async function listBusinesses(options?: {
  city?: string;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<DirectoryBusiness[]> {
  let query = supabase
    .from("businesses")
    .select(PUBLIC_COLUMNS)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 30);

  if (options?.city) query = query.eq("city", options.city);
  if (options?.category) query = query.eq("category", options.category);

  // ilike escapes its argument, unlike a hand-built or() filter string.
  if (options?.search) query = query.ilike("name", `%${options.search}%`);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as DirectoryBusiness[];
}

export async function getBusinessBySlug(slug: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as DirectoryBusiness | null;
}

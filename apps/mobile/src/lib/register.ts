// ============================================================================
// Source: apps/mobile/src/lib/register.ts
// Version: 1.0.0 — 2026-08-15
// Why: Business registration from the app — the same draft/submit contract as
//      the web's dashboard/business/new/actions.ts, written straight to
//      Supabase under the user's session (RLS restricts rows to created_by).
// Env / Identity: Anon client, signed-in user. Validation with the shared
//      zod schemas from @goplaza/core so web and mobile accept the same data.
// ============================================================================
import { finalBusinessSchema, slugify, type BusinessFormData, type TablesInsert } from "@goplaza/core";

import { supabase } from "./supabase";

export type { BusinessFormData };

/** Six-month verification window, mirroring the web gate. */
export function isFresh(iso: string | null | undefined, months = 6): boolean {
  if (!iso) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return new Date(iso) > cutoff;
}

export const emptyBusiness = (): BusinessFormData => ({
  name: "", name_en: "", category: "", sub_category: "", short_description: "",
  description: "", established_year: "", ownership_status: "owner",
  country: "Canada", province: "", city: "", address: "", postal_code: "",
  is_address_public: true, service_type: "both", service_area: "city",
  google_maps_url: "",
  phone: "", whatsapp: "", contact_email: "", website: "", instagram: "",
  telegram: "", linkedin: "", preferred_contact: "phone",
  business_number: "", license_info: "", languages: ["فارسی"],
  is_iranian_owned: true, verification_notes: "",
  logo_url: "", cover_url: "", brand_color: "", tagline: "",
  working_hours: {}, accepts_appointments: false, booking_url: "",
  services: [],
  branches: [],
});

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name || "business") || "business";
  let slug = base;
  for (let i = 1; i < 50; i++) {
    const { data } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

type BusinessInsert = TablesInsert<"businesses">;

/** Form data → table row. The form is a superset with a string year. */
function toRow(data: Partial<BusinessFormData>): Partial<BusinessInsert> {
  const { established_year, ...rest } = data;
  const year = established_year && /^\d{4}$/.test(established_year) ? parseInt(established_year, 10) : null;
  // The shared form type and the generated row type agree on every shared
  // key; the cast only bridges JSON columns (services, branches, hours).
  return { ...(rest as unknown as Partial<BusinessInsert>), established_year: year };
}

export type SaveResult = { success: true; businessId: string } | { success: false; error: string };

/** Loose save — anything goes, status DRAFT. */
export async function saveDraft(data: Partial<BusinessFormData>, businessId?: string): Promise<SaveResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

  const payload = { ...toRow(data), created_by: user.id, status: "DRAFT" as const, updated_at: new Date().toISOString() };

  if (businessId) {
    const { error } = await supabase.from("businesses").update(payload).eq("id", businessId).eq("created_by", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true, businessId };
  }
  const { data: inserted, error } = await supabase
    .from("businesses")
    .insert({
      ...payload,
      name: data.name ?? "",
      category: data.category ?? "",
      city: data.city ?? "",
      slug: await uniqueSlug(data.name ?? ""),
    })
    .select("id")
    .single();
  if (error || !inserted) return { success: false, error: error?.message ?? "ذخیره انجام نشد." };
  return { success: true, businessId: inserted.id };
}

export type SubmitResult =
  | { success: true; businessId: string }
  | { success: false; error: string; issues?: Record<string, string[] | undefined> };

/** Strict save — validated with the shared schema, status SUBMITTED. */
export async function submitBusiness(data: BusinessFormData, businessId?: string): Promise<SubmitResult> {
  const parsed = finalBusinessSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "اطلاعات فرم ناقص یا نامعتبر است.",
      issues: parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>,
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

  const payload = { ...toRow(parsed.data), created_by: user.id, status: "SUBMITTED" as const, updated_at: new Date().toISOString() };

  if (businessId) {
    const { error } = await supabase.from("businesses").update(payload).eq("id", businessId).eq("created_by", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true, businessId };
  }
  const { data: inserted, error } = await supabase
    .from("businesses")
    .insert({
      ...payload,
      name: parsed.data.name,
      category: parsed.data.category,
      city: parsed.data.city,
      slug: await uniqueSlug(parsed.data.name),
    })
    .select("id")
    .single();
  if (error || !inserted) return { success: false, error: error?.message ?? "ارسال انجام نشد." };
  return { success: true, businessId: inserted.id };
}

/** The user's own listings, newest first — for the "my businesses" entry. */
export async function listMyBusinesses() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("businesses")
    .select("id, name, slug, status, city, category, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

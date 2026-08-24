// ============================================================================
// Source: apps/mobile/src/lib/api.ts
// Version: 2.0.0 — 2026-08-24
// Why: The few things the app cannot do against Supabase directly — anything
//      that needs a server secret (Twilio, Resend, OpenAI) — go through the
//      web app's /api/mobile/* routes, authenticated with the user's Supabase
//      access token as a Bearer header.
//      v2 (24 Aug): a `get` helper alongside `post`. Every route here used to
//      need a session, which was right while they all did something on the
//      user's behalf; smart search does not — it works signed-out on the
//      website, so gating it behind a login on mobile would have been a
//      quieter way of not shipping it.
// Env / Identity: EXPO_PUBLIC_API_URL overrides the base (dev builds point at
//      the laptop); production defaults to https://goplaza.ca.
// ============================================================================
import { brand } from "@goplaza/core";
import { supabase } from "./supabase";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? brand.url).replace(/\/$/, "");

export type ApiResult<T> = ({ success: true } & T) | { success: false; error: string };

async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (!json) return { success: false, error: `پاسخ نامعتبر از سرور (${res.status}).` };
    return json;
  } catch {
    return { success: false, error: "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید." };
  }
}

/**
 * Unauthenticated GET. Returns null on any failure rather than throwing:
 * everything reached this way is an enhancement over something that already
 * worked, so a dead network must degrade the screen, not break it.
 */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- smart search

/** Search TERMS the model suggests — never results. See the route's header. */
export type SmartExpansion = {
  terms: string[];
  categories: string[];
  reason: string | null;
};

export async function expandQuery(q: string): Promise<SmartExpansion | null> {
  const body = await get<{ smart: SmartExpansion | null }>(
    `/api/mobile/search/smart?q=${encodeURIComponent(q)}`
  );
  return body?.smart ?? null;
}

/** Convert Persian/Arabic-Indic digits to ASCII — the forced-RTL keyboard trap. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// ---------------------------------------------------------------- contact codes

export type ContactType = "email" | "phone";

export function sendContactCode(type: ContactType) {
  return post<{ message?: string }>("/api/mobile/verify/send", { type });
}

export function checkContactCode(type: ContactType, code: string) {
  return post<Record<string, never>>("/api/mobile/verify/check", { type, code: toLatinDigits(code).trim() });
}

// ------------------------------------------------------------- website import

/** Mirrors ScrapedBusiness in apps/web/lib/ai/website-extract.ts. */
export type ImportedBusiness = {
  name?: string;
  name_en?: string;
  tagline?: string;
  short_description?: string;
  description?: string;
  category_slug?: string;
  sub_category?: string;
  established_year?: string;
  phone?: string;
  whatsapp?: string;
  contact_email?: string;
  website?: string;
  instagram?: string;
  telegram?: string;
  linkedin?: string;
  google_maps_url?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  languages?: string[];
  services?: { name: string; description?: string; price?: string; price_unit?: string }[];
  working_hours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  accepts_appointments?: boolean;
  booking_url?: string;
  logo_url?: string;
  confidence?: { high: string[]; low: string[] };
};

export function importFromWebsite(url: string, categories: { value: string; label: string }[]) {
  return post<{ data: ImportedBusiness; pagesRead: number }>("/api/mobile/business/import", {
    url,
    categories,
  });
}

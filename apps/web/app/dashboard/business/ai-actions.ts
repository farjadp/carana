// ============================================================================
// Source: app/dashboard/business/ai-actions.ts
// Version: 2.0.0 — 2026-08-15
// Why: "Read it from my website" for business onboarding — the signed-in,
//      rate-limited server action. The extraction itself lives in
//      lib/ai/website-extract.ts so it can be exercised without a session.
//      Returns a prefill for the 7-step form — never a finished listing. The
//      owner reviews and edits everything before anything is saved.
// Env / Identity: Signed-in users only, rate limited (8/hour). Outbound
//      fetches are SSRF-guarded (public http(s) hosts only, no redirects
//      into private space).
// ============================================================================
"use server";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import {
  extractBusinessFromWebsite,
  InvalidTargetError,
  type ScrapedBusiness,
} from "@/lib/ai/website-extract";

export type { ScrapedBusiness };

export type ScrapeResult =
  | { success: true; data: ScrapedBusiness; pagesRead: number }
  | { success: false; error: string };

export async function scrapeWebsiteForBusiness(
  url: string,
  categories: { value: string; label: string }[] = []
): Promise<ScrapeResult> {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    // Each call is up to five outbound fetches and one model call.
    const limit = rateLimit(`ai:scrape:${user.id}`, 8, 60 * 60);
    if (!limit.allowed) {
      return {
        success: false,
        error: `محدودیت استفاده. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
      };
    }

    const out = await extractBusinessFromWebsite(url, categories);
    return out.ok
      ? { success: true, data: out.data, pagesRead: out.pagesRead }
      : { success: false, error: out.error };
  } catch (error: unknown) {
    if (error instanceof InvalidTargetError) return { success: false, error: error.message };
    console.error("AI Scrape Error:", error);
    return { success: false, error: "خطایی در خواندن وب‌سایت یا پردازش هوش مصنوعی رخ داد." };
  }
}

// ============================================================================
// Source: app/api/mobile/business/import/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: "Read it from my website" for the mobile onboarding flow. Bearer auth,
//      same extractor and same rate limit as the web server action.
// Env / Identity: Server only (OpenAI key, outbound fetch). SSRF-guarded in
//      lib/ai/website-extract.ts.
// ============================================================================
import { NextResponse } from "next/server";

import { authenticateBearer } from "@/lib/auth/bearer";
import { extractBusinessFromWebsite, InvalidTargetError } from "@/lib/ai/website-extract";
import { rateLimit } from "@/lib/utils/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth) return NextResponse.json({ success: false, error: "ابتدا وارد شوید." }, { status: 401 });

  const limit = rateLimit(`ai:scrape:${auth.user.id}`, 8, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `محدودیت استفاده. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let url: unknown, categories: unknown;
  try {
    ({ url, categories } = await req.json());
  } catch {
    /* fall through */
  }
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ success: false, error: "آدرس وب‌سایت لازم است." }, { status: 400 });
  }
  const cats = Array.isArray(categories)
    ? categories
        .filter((c): c is { value: string; label: string } =>
          !!c && typeof c === "object" && typeof (c as { value?: unknown }).value === "string" && typeof (c as { label?: unknown }).label === "string")
        .slice(0, 50)
    : [];

  try {
    const out = await extractBusinessFromWebsite(url, cats);
    if (!out.ok) return NextResponse.json({ success: false, error: out.error }, { status: 422 });
    return NextResponse.json({ success: true, data: out.data, pagesRead: out.pagesRead });
  } catch (error: unknown) {
    if (error instanceof InvalidTargetError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Mobile import error:", error);
    return NextResponse.json({ success: false, error: "خطایی در خواندن وب‌سایت رخ داد." }, { status: 500 });
  }
}

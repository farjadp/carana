// ============================================================================
// Source: app/api/mobile/verify/check/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: Mobile counterpart of the dashboard's verifyCode. Bearer auth.
// Env / Identity: Server only. On success stamps *_verified_at on the profile.
// ============================================================================
import { NextResponse } from "next/server";

import { authenticateBearer } from "@/lib/auth/bearer";
import { checkContactCode } from "@/lib/verification/contact-codes";
import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth) return NextResponse.json({ success: false, error: "ابتدا وارد شوید." }, { status: 401 });

  const limit = rateLimit(`mobile:verify:check:${auth.user.id}`, 30, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: "تلاش‌های زیاد. کمی بعد دوباره امتحان کنید." }, { status: 429 });
  }

  let type: unknown, code: unknown;
  try {
    ({ type, code } = await req.json());
  } catch {
    /* fall through */
  }
  if ((type !== "email" && type !== "phone") || typeof code !== "string") {
    return NextResponse.json({ success: false, error: "ورودی نامعتبر است." }, { status: 400 });
  }

  // Persian/Arabic-Indic digits are the classic trap on a forced-RTL keyboard.
  const latin = code.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
                    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  const result = await checkContactCode(auth.user.id, type, latin.trim());
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

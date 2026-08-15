// ============================================================================
// Source: app/api/mobile/verify/send/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: Mobile counterpart of the dashboard's sendVerificationCode. Bearer
//      auth; same rules via lib/verification/contact-codes.ts.
// Env / Identity: Server only. The phone number always comes from the profile.
// ============================================================================
import { NextResponse } from "next/server";

import { authenticateBearer } from "@/lib/auth/bearer";
import { issueContactCode } from "@/lib/verification/contact-codes";
import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth) return NextResponse.json({ success: false, error: "ابتدا وارد شوید." }, { status: 401 });

  const limit = rateLimit(`mobile:verify:send:${auth.user.id}`, 10, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "درخواست‌های زیادی فرستاده‌اید. کمی بعد دوباره تلاش کنید." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let type: unknown;
  try {
    ({ type } = await req.json());
  } catch {
    /* fall through */
  }
  if (type !== "email" && type !== "phone") {
    return NextResponse.json({ success: false, error: "نوع تایید نامعتبر است." }, { status: 400 });
  }

  const result = await issueContactCode(auth.user.id, type, auth.user.email);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

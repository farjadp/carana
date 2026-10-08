// ============================================================================
// Source: app/api/mobile/account/delete/route.ts
// Version: 1.0.0 — 2026-10-08
// Why: In-app account deletion — App Store Guideline 5.1.1(v). The app cannot
//      hold the service role, so it asks this route, which runs exactly what
//      the website's /account/delete runs (lib/account/delete.ts).
// Env / Identity: Bearer-authenticated. The user id comes from the verified
//      token, never from the body — a caller can only delete themselves.
// ============================================================================
import { NextResponse } from "next/server";

import { deleteConfirmationOk, deleteUserAccount } from "@/lib/account/delete";
import { authenticateBearer } from "@/lib/auth/bearer";

export async function POST(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth) return NextResponse.json({ success: false, error: "ابتدا وارد شوید." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { confirmation?: unknown } | null;
  if (!deleteConfirmationOk(body?.confirmation)) {
    return NextResponse.json({ success: false, error: "برای تایید، عبارت DELETE را وارد کنید." }, { status: 400 });
  }

  const result = await deleteUserAccount(auth.user.id);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

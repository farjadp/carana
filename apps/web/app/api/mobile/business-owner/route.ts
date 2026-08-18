// ============================================================================
// Source: app/api/mobile/business-owner/route.ts
// Version: 1.0.0 — 2026-08-17
// Why: The "صاحب کسب‌وکار" section on the mobile business screen. `profiles`
//      is self-or-admin under RLS (20260811_auth_roles.sql) and must stay
//      that way, so the app cannot read a name directly and this route
//      resolves it instead — with the service role, behind exactly the gates
//      the web profile applies. Loosening the profiles policy so Hermes could
//      read it would publish every user's row to make three names visible.
// Env / Identity: Public GET, server only. Returns nothing but display name,
//      avatar and join month — never email, phone, role or the profile id.
// ============================================================================
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVerificationStatus, isTrusted } from "@/lib/verification/status";
import { ownerProfileId, ownerSectionVisible, type PublicOwner } from "@charana/core";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  if (!UUID_RE.test(businessId)) {
    return NextResponse.json({ owner: null }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select(
      "id, status, hide_owner, owner_user_id, created_by, verification_method, verified_at, verified_until, verified_phone, verified_email, phone, contact_email"
    )
    .eq("id", businessId)
    .maybeSingle();

  // The service role bypasses RLS, so the public-status check that RLS would
  // normally make has to be made here by hand.
  const PUBLIC_STATUSES = ["PUBLISHED", "APPROVED"];
  if (!business || !PUBLIC_STATUSES.includes(business.status)) {
    return NextResponse.json({ owner: null });
  }

  const trusted = isTrusted(getVerificationStatus(business));
  const ownerId = business.hide_owner || !trusted ? null : ownerProfileId(business);
  if (!ownerId) return NextResponse.json({ owner: null });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, avatar_url, created_at")
    .eq("id", ownerId)
    .maybeSingle();

  const owner: PublicOwner | null = profile
    ? { full_name: profile.full_name, avatar_url: profile.avatar_url, member_since: profile.created_at }
    : null;

  const visible = ownerSectionVisible({
    verificationTrusted: trusted,
    owner,
    hide_owner: business.hide_owner,
  });

  return NextResponse.json({ owner: visible ? owner : null });
}

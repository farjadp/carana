// ============================================================================
// Source: app/dashboard/verify-contact/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: Server shell for the contact-verification page.
//
//      v2 passes the REAL state in. v1 rendered from client state that always
//      started at "nothing is verified", so someone who had already verified
//      their email was asked to do it again, and the page could not tell them
//      which of the two steps was actually left.
// Env / Identity: Server Component; requires a signed-in user.
// ============================================================================
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { syncEmailVerifiedFromAuth } from "@/lib/profiles/sync-email-verified";

import { VerifyContactClient } from "./verify-contact-client";

export const metadata = {
  title: "تایید ایمیل و موبایل",
};

export default async function VerifyContactPage() {
  const user = await requireUser("/dashboard/verify-contact");

  // This is where the gates send people. If the address is already confirmed
  // in auth, stamp the profile here too — otherwise someone arrives to verify
  // an email they verified by clicking our own link.
  await syncEmailVerifiedFromAuth(user);

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, mobile_number, email_verified_at, phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const fresh = (at: string | null | undefined) => !!at && new Date(at) > sixMonthsAgo;

  return (
    <PageShell currentPath="/dashboard/verify-contact" currentSection="business">
      <VerifyContactClient
        email={profile?.email ?? user.email ?? null}
        mobile={profile?.mobile_number ?? null}
        emailVerified={fresh(profile?.email_verified_at)}
        phoneVerified={fresh(profile?.phone_verified_at)}
      />
    </PageShell>
  );
}

// ============================================================================
// Source: app/dashboard/verify-contact/page.tsx
// Version: 2.0.0 — 2026-08-20
// Why: Server shell for the contact-verification page.
// Env / Identity: Server Component. Requires a signed-in user; the interactive
//      form lives in verify-contact-client.tsx.
// ============================================================================
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";

import { VerifyContactClient } from "./verify-contact-client";
import { syncEmailVerifiedFromAuth } from "@/lib/profiles/sync-email-verified";

export const metadata = {
  title: "اعتبارسنجی تماس",
};

export default async function VerifyContactPage() {
  const user = await requireUser("/dashboard/verify-contact");

  // This is where the gates send people. If the address is already confirmed
  // in auth, stamp the profile here too — otherwise someone arrives to verify
  // an email they verified by clicking our own link.
  await syncEmailVerifiedFromAuth(user);

  return (
    <PageShell currentPath="/dashboard/verify-contact" currentSection="business">
      <VerifyContactClient />
    </PageShell>
  );
}

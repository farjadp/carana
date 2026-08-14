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

export const metadata = {
  title: "اعتبارسنجی تماس | čārana",
};

export default async function VerifyContactPage() {
  await requireUser("/dashboard/verify-contact");

  return (
    <PageShell currentPath="/dashboard/verify-contact" currentSection="business">
      <VerifyContactClient />
    </PageShell>
  );
}

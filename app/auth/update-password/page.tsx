// ============================================================================
// Source: app/auth/update-password/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Provide the post-reset password update flow.
// Env / Identity: Uses Supabase client auth through the shared AuthForm.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "تعریف رمز جدید | čārana",
};

export default function UpdatePasswordPage() {
  return (
    <PageShell currentPath="/auth/update-password" currentSection="business">
      <main className="page-main">
        <AuthForm mode="update-password" />
      </main>
    </PageShell>
  );
}

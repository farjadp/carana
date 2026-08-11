// ============================================================================
// Source: app/auth/forgot-password/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Provide password-reset initiation for existing users.
// Env / Identity: Uses Supabase client auth through the shared AuthForm.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "فراموشی رمز | čārana",
};

export default function ForgotPasswordPage() {
  return (
    <PageShell currentPath="/auth/forgot-password" currentSection="business">
      <main className="page-main">
        <AuthForm mode="forgot" />
      </main>
    </PageShell>
  );
}

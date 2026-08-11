// ============================================================================
// Source: app/auth/signup/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Provide the signup entry point for business-owner onboarding.
// Env / Identity: Uses Supabase client auth through the shared AuthForm.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "ثبت‌نام | čārana",
};

export default function SignupPage() {
  return (
    <PageShell currentPath="/auth/signup" currentSection="business">
      <main className="page-main">
        <AuthForm mode="signup" />
      </main>
    </PageShell>
  );
}

// ============================================================================
// Source: app/auth/login/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Provide the login entry point for users and business owners.
// Env / Identity: Uses Supabase client auth through the shared AuthForm.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "ورود | čārana",
};

export default function LoginPage() {
  return (
    <PageShell currentPath="/auth/login" currentSection="business">
      <main className="page-main">
        <AuthForm mode="login" />
      </main>
    </PageShell>
  );
}

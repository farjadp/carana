// ============================================================================
// Source: app/auth/signup/page.tsx
// Version: 1.4.0 — 2026-08-26
// Why: Provide the signup entry point for business-owner onboarding.
// Env / Identity: Redirects authenticated users and strips unsafe auth query params.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { getEnabledAuthProviders } from "@/lib/auth/providers";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { sanitizeAuthSearchParams } from "@/lib/auth/sanitize";

export const metadata: Metadata = {
  title: "ثبت‌نام",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await sanitizeAuthSearchParams("/auth/signup", searchParams);
  await redirectIfAuthenticated("/profile");

  const [stats, providers] = await Promise.all([getDirectoryStats(), getEnabledAuthProviders()]);

  return (
    <PageShell currentPath="/auth/signup" currentSection="business">
      <main className="page-main">
        <AuthForm mode="signup" stats={stats} googleEnabled={providers.google} />
      </main>
    </PageShell>
  );
}

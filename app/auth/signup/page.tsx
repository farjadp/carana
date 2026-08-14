// ============================================================================
// Source: app/auth/signup/page.tsx
// Version: 1.3.1 — 2026-08-11
// Why: Provide the signup entry point for business-owner onboarding.
// Env / Identity: Redirects authenticated users and strips unsafe auth query params.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { sanitizeAuthSearchParams } from "@/lib/auth/sanitize";

export const metadata: Metadata = {
  title: "ثبت‌نام | čārana",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await sanitizeAuthSearchParams("/auth/signup", searchParams);
  await redirectIfAuthenticated("/profile");

  return (
    <PageShell currentPath="/auth/signup" currentSection="business">
      <main className="page-main">
        <AuthForm mode="signup" />
      </main>
    </PageShell>
  );
}

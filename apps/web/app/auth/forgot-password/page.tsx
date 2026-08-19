// ============================================================================
// Source: app/auth/forgot-password/page.tsx
// Version: 1.3.1 — 2026-08-11
// Why: Provide password-reset initiation for existing users.
// Env / Identity: Redirects authenticated users and strips unsafe auth query params.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { sanitizeAuthSearchParams } from "@/lib/auth/sanitize";

export const metadata: Metadata = {
  title: "فراموشی رمز",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await sanitizeAuthSearchParams("/auth/forgot-password", searchParams);
  await redirectIfAuthenticated("/profile");

  const stats = await getDirectoryStats();

  return (
    <PageShell currentPath="/auth/forgot-password" currentSection="business">
      <main className="page-main">
        <AuthForm mode="forgot" stats={stats} />
      </main>
    </PageShell>
  );
}

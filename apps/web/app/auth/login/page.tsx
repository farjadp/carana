// ============================================================================
// Source: app/auth/login/page.tsx
// Version: 1.3.2 — 2026-08-11
// Why: Provide the login entry point for users and business owners.
// Env / Identity: Redirects authenticated users and strips unsafe auth query params.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { sanitizeAuthSearchParams } from "@/lib/auth/sanitize";

export const metadata: Metadata = {
  title: "ورود",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await sanitizeAuthSearchParams("/auth/login", searchParams);
  await redirectIfAuthenticated("/profile");

  const resolvedSearchParams = await searchParams;
  const resetSuccess = resolvedSearchParams.reset === "success";

  return (
    <PageShell currentPath="/auth/login" currentSection="business">
      <main className="page-main">
        {resetSuccess ? (
          <div className="auth-banner is-success">
            <strong>رمز عبور با موفقیت تغییر کرد.</strong>
            <span>حالا با رمز جدید وارد حساب کاربری شو.</span>
          </div>
        ) : null}
        <AuthForm mode="login" />
      </main>
    </PageShell>
  );
}

// ============================================================================
// Source: app/auth/update-password/page.tsx
// Version: 1.3.1 — 2026-08-11
// Why: Provide the post-reset password update flow.
// Env / Identity: Strips unsafe auth query params before rendering the reset form.
// ============================================================================
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { getDirectoryStats } from "@/lib/data/directory-stats";
import { sanitizeAuthSearchParams } from "@/lib/auth/sanitize";

export const metadata: Metadata = {
  title: "تعریف رمز جدید",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await sanitizeAuthSearchParams("/auth/update-password", searchParams);

  const stats = await getDirectoryStats();

  return (
    <PageShell currentPath="/auth/update-password" currentSection="business">
      <main className="page-main">
        <AuthForm mode="update-password" stats={stats} />
      </main>
    </PageShell>
  );
}

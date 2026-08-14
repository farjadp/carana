// ============================================================================
// Source: app/dashboard/layout.tsx
// Version: 1.3.0 — 2026-08-11
// Why: Protect the dashboard subtree behind a real authenticated session.
// Env / Identity: Uses SSR auth and redirects unauthenticated users safely.
// ============================================================================
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser("/dashboard");

  return children;
}

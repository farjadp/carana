// ============================================================================
// Source: app/dashboard/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Introduce the dashboard model and post-auth landing structure.
// Env / Identity: Static dashboard overview aligned with role-based access design.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardOverview } from "@/components/dashboard-overview";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "داشبورد | čārana",
};

export default function DashboardPage() {
  return (
    <PageShell currentPath="/dashboard" currentSection="business">
      <main className="page-main">
        <DashboardOverview />

        <section className="download">
          <div>
            <p className="eyebrow">گام بعدی</p>
            <h2>از اینجا پنل‌ها می‌توانند به role واقعی متصل شوند.</h2>
            <p>
              مرحله بعد تعریف جدول‌های `profiles`، `business_claims` و `business_memberships`
              در Supabase و بستن access control با RLS است.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/business">پنل صاحب کسب‌وکار</Link>
          </Button>
        </section>
      </main>
    </PageShell>
  );
}

// ============================================================================
// Source: app/auth/callback/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: v1 was a Route Handler. It could only see `?code=`, so every callback
//      that answered in the URL fragment — which is what a real signup
//      confirmation link does — ended on /auth/error with no explanation.
//      A page can run in the browser, which is the only place a fragment
//      exists; the cookie-writing half stays in a Server Action.
// Env / Identity: Public. `next` is passed through getSafeNextPath so a
//      crafted link cannot redirect off-site (unchanged from v1).
// ============================================================================
import type { Metadata } from "next";

import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getSafeNextPath } from "@/lib/auth/redirect";
import { CallbackClient } from "./callback-client";

export const metadata: Metadata = { title: "در حال تکمیل ورود", robots: { index: false } };

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

  return (
    <PageShell currentPath="/auth/callback" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <h1>یک لحظه…</h1>
            <CallbackClient code={one(params.code)} next={getSafeNextPath(one(params.next))} />
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

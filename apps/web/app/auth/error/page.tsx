// ============================================================================
// Source: app/auth/error/page.tsx
// Version: 1.3.0 — 2026-08-11
// Why: Show a generic auth error page without leaking sensitive details.
// Env / Identity: Static fallback for auth callback failures.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "خطای احراز هویت",
};

export default function AuthErrorPage() {
  return (
    <PageShell currentPath="/auth/error" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <p className="eyebrow">احراز هویت</p>
            <h1>فرآیند ورود یا بازیابی کامل نشد</h1>
            <p className="auth-paragraph">
              برای امنیت بیشتر، جزئیات فنی خطا اینجا نمایش داده نمی‌شود. دوباره تلاش کن یا از
              مسیر بازیابی رمز عبور وارد شو.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/auth/login">بازگشت به ورود</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/auth/forgot-password">بازیابی رمز</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

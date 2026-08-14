// ============================================================================
// Source: app/auth/recovery-sent/page.tsx
// Version: 1.3.2 — 2026-08-11
// Why: Confirm that the password recovery email flow has been initiated.
// Env / Identity: Static post-recovery request page.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "لینک بازیابی ارسال شد",
};

export default async function RecoverySentPage() {
  await redirectIfAuthenticated("/profile");

  return (
    <PageShell currentPath="/auth/recovery-sent" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <p className="eyebrow">بازیابی رمز</p>
            <h1>اگر ایمیل معتبر باشد، لینک بازیابی برایت ارسال شده است</h1>
            <p className="auth-paragraph">
              ایمیل inbox و spam را بررسی کن. وقتی روی لینک کلیک کنی، به صفحه تعریف رمز جدید
              برمی‌گردی.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/auth/login">بازگشت به ورود</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/auth/forgot-password">ارسال دوباره</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

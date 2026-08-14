// ============================================================================
// Source: app/auth/signup-success/page.tsx
// Version: 1.0.0 — 2026-08-11
// Why: Provide a clear post-signup confirmation step before sending the user into the profile area.
// Env / Identity: Requires an authenticated session created during the test-mode signup flow.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ثبت نام موفق",
};

export default async function SignupSuccessPage() {
  const user = await requireUser("/auth/signup-success");
  const fullName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  return (
    <PageShell currentPath="/auth/signup-success" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <p className="eyebrow">ثبت نام انجام شد</p>
            <h1>{fullName ? `${fullName}، حساب شما با موفقیت ساخته شد.` : "حساب شما با موفقیت ساخته شد."}</h1>
            <p className="auth-paragraph">
              ثبت‌نام اولیه کامل است و سشن کاربر هم فعال شده. در مرحله بعد می‌توانی وارد پروفایل
              شوی و بعداً از همان‌جا پنل کسب‌وکار را گسترش بدهیم.
            </p>
            <div className="auth-steps">
              <p>۱. حساب کاربری ساخته شد.</p>
              <p>۲. ورود شما به صورت خودکار انجام شد.</p>
              <p>۳. حالا از دکمه زیر وارد پروفایل شوید.</p>
            </div>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/profile">ورود به پروفایل</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/">بازگشت به خانه</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

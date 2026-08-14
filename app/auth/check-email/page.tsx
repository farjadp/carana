// ============================================================================
// Source: app/auth/check-email/page.tsx
// Version: 1.3.2 — 2026-08-11
// Why: Confirm signup completion and guide the user to verify their email.
// Env / Identity: Static post-signup journey page.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ایمیل تایید را بررسی کن | čārana",
};

export default async function CheckEmailPage() {
  await redirectIfAuthenticated("/profile");

  return (
    <PageShell currentPath="/auth/check-email" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <p className="eyebrow">ثبت‌نام کامل شد</p>
            <h1>حساب ساخته شد. حالا ایمیلت را بررسی کن.</h1>
            <p className="auth-paragraph">
              اگر تایید ایمیل در Supabase فعال باشد، یک لینک برایت ارسال شده است. روی آن کلیک
              کن تا حساب فعال شود و بعد به داشبورد برگردی.
            </p>
            <div className="auth-steps">
              <p>۱. ایمیل inbox و spam را بررسی کن.</p>
              <p>۲. روی لینک تایید کلیک کن.</p>
              <p>۳. بعد از تایید، دوباره وارد حساب شو.</p>
            </div>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/auth/login">رفتن به صفحه ورود</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/contact">اگر ایمیل نرسید، تماس بگیر</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

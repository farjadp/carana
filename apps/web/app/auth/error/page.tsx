// ============================================================================
// Source: app/auth/error/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: v1 showed one sentence for every failure — «برای امنیت بیشتر، جزئیات
//      فنی خطا اینجا نمایش داده نمی‌شود» — and offered ورود / بازیابی رمز.
//      For the commonest case, a signup confirmation link that expired or was
//      opened in another browser, both doors are the wrong one and the person
//      is told nothing they can act on. "The link has expired" is not a
//      security detail; the account's existence is, and this page still never
//      confirms that.
//
//      The callback now passes a `code` naming the failure, so each case gets
//      the sentence and the door that fit it.
// Env / Identity: Public, no-index. `reason` is Supabase's raw text and is
//      shown only as a small technical footnote, never as the explanation.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResendConfirmation } from "./error-client";

export const metadata: Metadata = { title: "خطای احراز هویت", robots: { index: false } };

type Case = {
  title: string;
  body: string;
  /** Whether the "send me a new link" form belongs on this failure. */
  resend: boolean;
};

const CASES: Record<string, Case> = {
  otp_expired: {
    title: "این لینک دیگر معتبر نیست",
    body: "لینک‌های تأیید و ورود مدت‌دار و یک‌بارمصرف‌اند. اگر قبلاً روی همین لینک زده‌ای، همان بار مصرف شده است.",
    resend: true,
  },
  access_denied: {
    title: "این لینک دیگر معتبر نیست",
    body: "لینک منقضی شده یا قبلاً استفاده شده است.",
    resend: true,
  },
  wrong_browser: {
    title: "این لینک باید در همان مرورگری باز شود که ثبت‌نام کردی",
    body: "برای امنیت، نیمی از کلید در مرورگری می‌ماند که فرآیند را شروع کرده. اگر ثبت‌نام را روی لپ‌تاپ انجام داده‌ای و ایمیل را روی گوشی باز کرده‌ای، همین اتفاق می‌افتد. لینک را در همان دستگاه اول باز کن، یا لینک تازه‌ای بگیر و همان‌جا بازش کن.",
    resend: true,
  },
  no_credentials: {
    title: "این آدرس چیزی برای تکمیل نداشت",
    body: "این صفحه انتهای یک لینک ایمیل است و به‌تنهایی کاری نمی‌کند. اگر از ایمیل آمده‌ای، ممکن است برنامه‌ی ایمیلت بخشی از لینک را حذف کرده باشد — لینک را کامل کپی کن و در نوار آدرس مرورگر بگذار.",
    resend: true,
  },
  session_failed: {
    title: "نشست ساخته نشد",
    body: "لینک درست بود ولی مرورگر نتوانست نشست را نگه دارد. اگر کوکی‌ها را برای این سایت بسته‌ای یا در حالت ناشناس با کوکی محدود هستی، همین پیش می‌آید.",
    resend: false,
  },
  exchange_failed: {
    title: "ورود کامل نشد",
    body: "لینک پذیرفته نشد. اگر تازه ثبت‌نام کرده‌ای، لینک تازه بگیر؛ وگرنه از راه رمز عبور وارد شو.",
    resend: true,
  },
};

const FALLBACK: Case = {
  title: "فرآیند ورود یا بازیابی کامل نشد",
  body: "دوباره تلاش کن، یا اگر تازه ثبت‌نام کرده‌ای لینک تأیید را دوباره بگیر.",
  resend: true,
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const code = one(params.code);
  const reason = one(params.reason);
  const c = (code && CASES[code]) || FALLBACK;

  return (
    <PageShell currentPath="/auth/error" currentSection="business">
      <main className="page-main">
        <Card className="auth-card">
          <CardContent>
            <h1>{c.title}</h1>
            <p className="auth-paragraph">{c.body}</p>

            {c.resend ? <ResendConfirmation /> : null}

            <div className="hero-actions mt-6">
              <Button asChild>
                <Link href="/auth/login">ورود با رمز عبور</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/auth/forgot-password">بازیابی رمز</Link>
              </Button>
            </div>

            {/* The raw text, small and last: useful when someone reports this
                to support, never the explanation itself. */}
            {reason ? (
              <p className="mt-6 text-xs text-[color:var(--muted-text)]" dir="ltr">
                {reason}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
}

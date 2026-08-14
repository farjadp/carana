// ============================================================================
// Source: app/error.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Catch render errors so a failure shows a branded page, not a blank one.
// Env / Identity: Client component — the error boundary must be one.
//      The raw message is logged, never shown, so internals do not leak.
// ============================================================================
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main className="page-main">
      <section className="page-hero">
        <p className="eyebrow">خطا</p>
        <h1>مشکلی پیش آمد</h1>
        <p>
          این خطا ثبت شد و بررسی می‌شود. می‌توانید دوباره تلاش کنید یا به صفحه‌ی
          اصلی برگردید.
        </p>
        {error.digest ? (
          <p className="legal-meta">کد پیگیری: {error.digest}</p>
        ) : null}
        <div className="hero-actions">
          <button type="button" onClick={reset} className="btn-solid">
            تلاش دوباره
          </button>
          <Link href="/" className="btn-muted">بازگشت به خانه</Link>
        </div>
      </section>
    </main>
  );
}

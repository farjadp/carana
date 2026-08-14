// ============================================================================
// Source: app/not-found.tsx
// Version: 1.0.0 — 2026-08-22
// Why: A branded 404 instead of the Next.js default.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "صفحه پیدا نشد | čārana" };

export default function NotFound() {
  return (
    <PageShell currentPath="/" currentSection="home">
      <main className="page-main">
        <section className="page-hero">
          <p className="eyebrow">۴۰۴</p>
          <h1>این صفحه پیدا نشد</h1>
          <p>
            ممکن است لینک قدیمی باشد یا کسب‌وکاری که دنبالش بودید حذف شده باشد.
          </p>
          <div className="hero-actions">
            <Link href="/" className="btn-solid">بازگشت به خانه</Link>
            <Link href="/categories" className="btn-muted">مرور دسته‌بندی‌ها</Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

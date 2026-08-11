// ============================================================================
// Source: app/architecture/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Document the user-role, access-control, and panel architecture in-app.
// Env / Identity: Static architecture page aligned with Supabase auth strategy.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { DashboardOverview } from "@/components/dashboard-overview";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "معماری کاربری و دسترسی | čārana",
};

export default function ArchitecturePage() {
  return (
    <PageShell currentPath="/architecture" currentSection="business">
      <main className="page-main">
        <DashboardOverview />

        <section className="info-grid">
          {[
            ["جدول profiles", "برای نگه‌داری نقش پایه کاربر، نام، وضعیت تکمیل پروفایل و تنظیمات حساب."],
            ["جدول businesses", "اطلاعات عمومی listingها که برای همه کاربران قابل‌خواندن است."],
            ["جدول business_memberships", "رابط میان user و business برای نقش‌هایی مثل owner, manager, editor."],
            ["جدول business_claims", "درخواست‌های claim یا ownership verification که باید توسط ادمین بررسی شوند."],
            ["RLS", "خواندن public برای listingها، اما write فقط برای owner یا admin با policy روشن."],
            ["Auth flow", "ثبت‌نام، تأیید ایمیل، ورود، فراموشی رمز، و بعد از آن onboarding نقش و claim flow."],
          ].map(([title, description]) => (
            <Card key={title} className="info-card">
              <CardContent>
                <strong>{title}</strong>
                <p>{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="download">
          <div>
            <p className="eyebrow">خروجی این فاز</p>
            <h2>معماری دسترسی با flowهای auth حالا در خود اپ دیده می‌شود.</h2>
            <p>
              از اینجا می‌توانیم برویم سراغ schema واقعی Supabase و بستن roleها، policies و
              claim workflow.
            </p>
          </div>
          <Button asChild>
            <Link href="/auth/signup">شروع ثبت‌نام</Link>
          </Button>
        </section>
      </main>
    </PageShell>
  );
}

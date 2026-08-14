// ============================================================================
// Source: app/account/delete/page.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Self-service account deletion, required by App Store Guideline 5.1.1(v).
//      The URL is stable and linked from the privacy policy so App Review can
//      find it without signing in.
// Env / Identity: Server component; requires an authenticated user.
// ============================================================================
import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { requireUser } from "@/lib/auth/session";

import { DeleteAccountClient } from "./delete-client";

export const metadata: Metadata = {
  title: "حذف حساب کاربری",
  description: "حذف دائمی حساب کاربری و تمام اطلاعات شخصی در چارانا.",
};

export default async function DeleteAccountPage() {
  const user = await requireUser("/account/delete");

  return (
    <InnerPage
      currentPath="/account/delete"
      currentSection="brand"
      eyebrow="حساب کاربری"
      title="حذف دائمی حساب کاربری"
      description="اگر مطمئن هستید، از این صفحه می‌توانید حساب و تمام اطلاعات شخصی‌تان را برای همیشه حذف کنید."
    >
      <DeleteAccountClient email={user.email ?? ""} />
    </InnerPage>
  );
}

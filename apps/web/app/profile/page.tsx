// ============================================================================
// Source: app/profile/page.tsx
// Version: 1.4.0 — 2026-08-11
// Why: Provide the first protected landing page after login for each user.
// Env / Identity: Requires an authenticated Supabase session and attempts profile creation.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ensureUserProfile } from "@/lib/profiles/ensure-profile";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "پروفایل کاربری | čārana",
};

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const { profile, status } = await ensureUserProfile(user);

  const profileStatusCopy =
    status === "ready"
      ? "پروفایل backend این کاربر ثبت شده و آماده توسعه بیشتر است."
      : status === "missing_table"
        ? "ورود موفق بود، اما جدول profiles هنوز روی Supabase apply نشده است."
        : "ورود موفق بود، اما ساخت پروفایل backend با خطا مواجه شد و نیاز به بررسی دارد.";

  return (
    <PageShell currentPath="/profile" currentSection="business">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h1 className="text-3xl font-black text-[color:var(--text)] mb-2">داشبورد کاربری</h1>
          <p className="text-[color:var(--muted-text)]">
            به پنل کاربری چارانا خوش آمدید. از اینجا می‌توانید فعالیت‌ها و اطلاعات خود را مدیریت کنید.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <strong className="text-sm text-gray-500 block mb-1">حساب کاربری</strong>
              <p className="font-medium text-lg">{user.email ?? "ایمیل ثبت نشده"}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <strong className="text-sm text-gray-500 block mb-1">نقش دسترسی</strong>
              <p className="font-medium text-lg">
                {profile?.role === "admin" ? "مدیر کل" : "کاربر عادی"}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-10">
          <ProfileForm profile={profile} email={user.email || ""} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold mb-4">دسترسی سریع</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <h3 className="font-bold mb-2">تعاملات من</h3>
                <p className="text-sm text-gray-500 mb-4">ذخیره‌شده‌ها، یادداشت‌ها و نظرات</p>
                <Button asChild variant="muted" className="w-full">
                  <Link href="/profile/interactions">مشاهده دفترچه</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition border-[color:var(--lajvard)]">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <h3 className="font-bold mb-2">کسب‌وکار من</h3>
                <p className="text-sm text-gray-500 mb-4">ثبت و مدیریت اطلاعات کسب‌وکار</p>
                <Button asChild className="w-full bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white">
                  <Link href="/dashboard/business">پنل کسب‌وکار</Link>
                </Button>
              </CardContent>
            </Card>

            {profile?.role === "admin" && (
              <Card className="hover:shadow-md transition border-gray-800">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <h3 className="font-bold mb-2">مدیریت پلتفرم</h3>
                  <p className="text-sm text-gray-500 mb-4">بررسی نظرات و مدیریت سیستم</p>
                  <Button asChild variant="solid" className="w-full bg-gray-900 hover:bg-gray-800">
                    <Link href="/admin/reviews">پنل ادمین</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}

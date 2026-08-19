// ============================================================================
// Source: app/dashboard/business/[id]/edit/page.tsx
// Version: 1.1.0 — 2026-08-17
// Why: Server Component that loads existing business data and renders the edit form.
//      Enforces auth and ownership before rendering anything.
// Env / Identity: Server Component
// ============================================================================
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { getBusinessForEdit } from "./actions";
import BusinessEditForm from "./edit-form";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getVerificationStatus, isTrusted } from "@/lib/verification/status";
import { ownerProfileId } from "@goplaza/core";

export const metadata: Metadata = {
  title: "ویرایش کسب‌وکار",
};

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessEditPage({ params }: EditPageProps) {
  // اطمینان از لاگین بودن کاربر
  await requireUser("/dashboard/business");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone_verified_at, email_verified_at")
      .eq("id", user.id)
      .single();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const phoneVerified = profile?.phone_verified_at && new Date(profile.phone_verified_at) > sixMonthsAgo;
    const emailVerified = profile?.email_verified_at && new Date(profile.email_verified_at) > sixMonthsAgo;

    if (!phoneVerified || !emailVerified) {
      redirect("/dashboard/verify-contact");
    }
  }

  const { id } = await params;

  // بارگذاری داده‌های کسب‌وکار از سرور با بررسی مالکیت
  const result = await getBusinessForEdit(id);

  if (!result.success || !result.business) {
    // اگر کسب‌وکار یافت نشد یا کاربر مجاز نیست → صفحه ۴۰۴
    notFound();
  }

  const { business } = result;

  // What the public profile would print in the "صاحب کسب‌وکار" section, so the
  // owner's control is a preview of the real thing rather than a claim about
  // it. Resolved with the same core rule the profile page uses.
  const ownerId = ownerProfileId(business);
  let ownerName: string | null = null;
  if (ownerId) {
    const admin = createSupabaseAdminClient();
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", ownerId)
      .maybeSingle();
    ownerName = ownerProfile?.full_name ?? null;
  }

  return (
    <PageShell currentPath="/dashboard/business" currentSection="business">
      <main className="page-main py-8">
        <div className="max-w-3xl mx-auto px-4">
          <BusinessEditForm
            businessId={id}
            initialData={business}
            ownerIdentity={{ name: ownerName, verified: isTrusted(getVerificationStatus(business)) }}
          />
        </div>
      </main>
    </PageShell>
  );
}

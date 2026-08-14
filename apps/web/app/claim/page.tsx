// ============================================================================
// Source: app/claim/page.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Every unclaimed business profile has linked here since launch and the
//      route did not exist — it returned 404. With 677 imported listings that
//      was nearly the whole directory, so owner acquisition began at a dead end.
// Env / Identity: Server Component. Requires a signed-in user; the claim
//      itself is proven by SMS to the number already published on the listing.
// ============================================================================

import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerificationStatus } from "@/lib/verification/status";
import ClaimClient from "./claim-client";

export const metadata: Metadata = {
  title: "احراز مالکیت کسب‌وکار | چارانا",
  description: "مالکیت کسب‌وکار خود را در چارانا احراز کنید.",
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const { businessId } = await searchParams;

  if (!businessId) notFound();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Send them back here after login rather than dropping them on the dashboard.
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/claim?businessId=${businessId}`)}`);
  }

  // RLS applies: only a published listing is readable by a normal account.
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, slug, name, city, phone, category, verification_method, verified_at, verified_until, verified_phone, verified_email, contact_email, owner_user_id"
    )
    .eq("id", businessId)
    .maybeSingle();

  if (!business) notFound();

  const status = getVerificationStatus(business);
  const alreadyMine = business.owner_user_id === user.id;
  const takenByOther = !!business.owner_user_id && !alreadyMine;

  return (
    <PageShell currentPath="/claim" currentSection="business">
      <div className="mx-auto max-w-xl px-4 py-10" dir="rtl">
        <nav className="mb-6 text-sm text-[#5f6472]">
          <Link href={`/businesses/${business.slug}`} className="hover:underline">
            ← بازگشت به {business.name}
          </Link>
        </nav>

        <h1 className="text-2xl font-extrabold text-[#14213d] mb-2">
          احراز مالکیت کسب‌وکار
        </h1>
        <p className="text-[#5f6472] leading-relaxed mb-8">
          {business.name}
          {business.city ? ` — ${business.city}` : ""}
        </p>

        {takenByOther ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">این کسب‌وکار قبلاً احراز شده است</p>
            <p>
              اگر فکر می‌کنید اشتباهی رخ داده یا مالکیت این کسب‌وکار تغییر کرده،
              با <Link href="/contact" className="underline font-medium">پشتیبانی</Link> تماس بگیرید.
            </p>
          </div>
        ) : alreadyMine ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 leading-relaxed">
            <p className="font-bold mb-1">این کسب‌وکار متعلق به شماست</p>
            <p className="mb-3">
              مالکیت شما قبلاً احراز شده است.
              {status.daysRemaining !== null && status.daysRemaining > 0
                ? " برای مدیریت آن به داشبورد بروید."
                : " تایید شما نیاز به تمدید دارد."}
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-[#800000] px-4 py-2 font-bold text-[#f6f1e8]"
            >
              رفتن به داشبورد
            </Link>
          </div>
        ) : (
          <ClaimClient
            businessId={business.id}
            businessName={business.name}
            hasPhone={!!business.phone?.trim()}
          />
        )}
      </div>
    </PageShell>
  );
}

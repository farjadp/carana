// ============================================================================
// Source: app/admin/(dashboard)/claims/[id]/page.tsx
// Version: 1.0.0 — 2026-08-27
// Why: One ownership claim, opened from the queue. The queue could only ever
//      say who asked for what; the decision needs the other half — what the
//      listing looks like NOW and what approving would change about it.
//      The «اکنون / پس از تایید» table is that half, and it is read from live
//      rows, not from what the claim asserts.
// Env / Identity: Server Component, admin/moderator only.
// ============================================================================
import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ArrowLeft, Building2, Clock, Info, ShieldCheck, User, XCircle } from "lucide-react";

import { METHOD_LABEL, STATE_LABEL, getVerificationStatus, nextExpiry } from "@/lib/verification/status";
import { NotAuthenticatedError, requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ClaimDecision } from "./claim-decision";

export const metadata: Metadata = { title: "بررسی درخواست مالکیت | داشبورد ادمین" };
export const dynamic = "force-dynamic";

const dateTime = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const dateOnly = (d: Date) =>
  d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });

const CLAIM_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "در انتظار بررسی", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "تایید شده", className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "رد شده", className: "bg-red-100 text-red-800 border-red-200" },
};

/** How the claim was (or would be) proven. `null` while it is still pending. */
const CLAIM_METHOD_FA: Record<string, string> = {
  sms_to_listed_number: "کد پیامکی روی شماره منتشرشده آگهی",
  manual_review: "بررسی دستی ادمین",
};

function person(p: { full_name?: string | null; email?: string | null } | null | undefined) {
  if (!p) return null;
  return p.full_name?.trim() || p.email || null;
}

export default async function ClaimReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase);
  } catch (e) {
    redirect(e instanceof NotAuthenticatedError ? "/admin/login" : "/auth/login?error=unauthorized");
  }

  const admin = createSupabaseAdminClient();

  const { data: claim } = await admin
    .from("business_claims")
    .select(
      "id, business_id, user_id, status, note, method, created_at, reviewed_at, reviewed_by, verified_at, verified_phone"
    )
    .eq("id", id)
    .maybeSingle();

  if (!claim) notFound();

  const { data: business } = await admin
    .from("businesses")
    .select(
      "id, name, name_en, slug, status, city, province, phone, contact_email, created_by, owner_user_id, verification_method, verified_at, verified_until, verified_phone, verified_email"
    )
    .eq("id", claim.business_id)
    .maybeSingle();

  const profileIds = [claim.user_id, business?.owner_user_id, business?.created_by, claim.reviewed_by].filter(
    Boolean
  ) as string[];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", Array.from(new Set(profileIds)));

  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const claimant = byId.get(claim.user_id as string) ?? null;
  const currentOwner = business?.owner_user_id ? byId.get(business.owner_user_id as string) ?? null : null;
  const creator = business?.created_by ? byId.get(business.created_by as string) ?? null : null;
  const reviewer = claim.reviewed_by ? byId.get(claim.reviewed_by as string) ?? null : null;

  const { data: membership } = business
    ? await admin
        .from("business_memberships")
        .select("role")
        .eq("business_id", business.id)
        .eq("user_id", claim.user_id)
        .maybeSingle()
    : { data: null };

  const status = business ? getVerificationStatus(business) : null;
  const isPending = claim.status === "pending";
  const badge = CLAIM_STATUS_BADGE[claim.status as string] ?? CLAIM_STATUS_BADGE.pending;

  const claimantLabel = person(claimant) ?? "کاربر بدون نام";
  const ownerLabel = currentOwner
    ? person(currentOwner) ?? "کاربر بدون نام"
    : "ندارد — هنوز مالکی احراز نشده";

  // The right-hand column is a projection of what approveClaim() writes, not a
  // promise: it is only rendered while the claim is still pending.
  const wouldExpire = nextExpiry(new Date());

  const diff: { label: string; now: string; next: string }[] = [
    { label: "مالک ثبت‌شده", now: ownerLabel, next: claimantLabel },
    {
      label: "نشان احراز",
      now: status ? STATE_LABEL[status.state] : "—",
      next: `تاییدشده تا ${dateOnly(wouldExpire)}`,
    },
    {
      label: "روش احراز",
      now: business?.verification_method
        ? METHOD_LABEL[business.verification_method as keyof typeof METHOD_LABEL]
        : "—",
      next: `${METHOD_LABEL.claimed} (${CLAIM_METHOD_FA.manual_review})`,
    },
    {
      label: "دسترسی در پنل کسب‌وکار",
      now: membership?.role ? `عضو (${membership.role})` : "ندارد",
      next: "مالک (owner)",
    },
    {
      label: "شماره ثبت‌شده به‌عنوان مدرک",
      now: business?.verified_phone || "—",
      next: business?.phone || "—",
    },
  ];

  return (
    <div className={`mx-auto max-w-4xl space-y-6 ${isPending ? "pb-28" : "pb-10"}`}>
      <div className="flex items-center gap-4">
        <Link
          href="/admin/claims"
          className="rounded-lg border border-[color:var(--line)] bg-white p-2 text-[color:var(--muted-text)] transition hover:bg-gray-50"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-[color:var(--text)]">
            بررسی درخواست مالکیت
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${badge.className}`}>
              {badge.label}
            </span>
          </h1>
          <p className="mt-1 text-sm text-[color:var(--muted-text)]">
            ثبت شده در: <span dir="ltr">{dateTime(claim.created_at as string)}</span>
          </p>
        </div>
      </div>

      {!business && (
        <p className="rounded-xl border border-red-300 bg-red-50/40 p-4 text-sm font-bold text-red-700">
          کسب‌وکار این درخواست دیگر وجود ندارد.
        </p>
      )}

      {/* What the decision changes */}
      <Card className="admin-panel-card">
        <div className="panel-header flex items-center gap-2 border-b border-[color:var(--line)] px-6 pb-4 pt-6">
          <ShieldCheck size={18} className="text-[color:var(--lajvard)]" />
          <h2 className="text-lg font-bold">{isPending ? "چه چیزی تغییر می‌کند" : "وضعیت فعلی مالکیت"}</h2>
        </div>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-[color:var(--muted-text)]">
                <tr>
                  <th className="pb-2 font-medium">مورد</th>
                  <th className="pb-2 font-medium">اکنون</th>
                  {isPending && <th className="pb-2 font-medium">پس از تایید</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {diff.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3 pl-4 text-[color:var(--muted-text)]">{row.label}</td>
                    <td className="py-3 pl-4">{row.now}</td>
                    {isPending && (
                      <td className="py-3">
                        <span className="font-bold text-emerald-700">{row.next}</span>
                        <ArrowLeft size={12} className="mr-1 inline text-emerald-600" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isPending && (
            <p className="mt-4 text-xs leading-relaxed text-[color:var(--muted-text)]">
              هیچ‌کدام از اطلاعات خود آگهی (نام، آدرس، توضیحات) با تایید این درخواست تغییر نمی‌کند؛ فقط
              مالکیت و نشان احراز جابه‌جا می‌شود. رد کردن درخواست هیچ تغییری روی آگهی نمی‌گذارد.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Claimant */}
        <Card className="admin-panel-card">
          <div className="panel-header flex items-center gap-2 border-b border-[color:var(--line)] px-6 pb-4 pt-6">
            <User size={18} className="text-[color:var(--lajvard)]" />
            <h2 className="text-lg font-bold">متقاضی</h2>
          </div>
          <CardContent className="space-y-3 pt-6 text-sm">
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">نام</span>
              <strong className="text-[color:var(--text)]">{claimantLabel}</strong>
            </div>
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">ایمیل</span>
              <strong className="text-[color:var(--text)]" dir="ltr">{claimant?.email || "—"}</strong>
            </div>
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">روش اثبات</span>
              <span className="text-[color:var(--text)]">
                {claim.method ? CLAIM_METHOD_FA[claim.method as string] ?? claim.method : "هنوز چیزی اثبات نشده"}
              </span>
            </div>
            {claim.verified_phone && (
              <div>
                <span className="mb-1 block text-xs text-[color:var(--muted-text)]">شماره تاییدشده</span>
                <span className="text-[color:var(--text)]" dir="ltr">{claim.verified_phone as string}</span>
              </div>
            )}
            <div className="border-t border-[color:var(--line)] pt-3">
              <Link
                href={`/admin/users/${claim.user_id}`}
                className="text-xs font-bold text-[color:var(--lajvard)] hover:underline"
              >
                مشاهده لاگ‌های این کاربر
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Business */}
        <Card className="admin-panel-card">
          <div className="panel-header flex items-center gap-2 border-b border-[color:var(--line)] px-6 pb-4 pt-6">
            <Building2 size={18} className="text-[color:var(--lajvard)]" />
            <h2 className="text-lg font-bold">کسب‌وکار</h2>
          </div>
          <CardContent className="space-y-3 pt-6 text-sm">
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">نام</span>
              <strong className="text-[color:var(--text)]">{business?.name || "—"}</strong>
            </div>
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">شهر</span>
              <span className="text-[color:var(--text)]">
                {business ? `${business.province ?? "—"}, ${business.city ?? "—"}` : "—"}
              </span>
            </div>
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">شماره منتشرشده در آگهی</span>
              <span className="text-[color:var(--text)]" dir="ltr">{business?.phone || "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs text-[color:var(--muted-text)]">ثبت‌کننده</span>
              <span className="text-[color:var(--text)]">{person(creator) ?? "—"}</span>
            </div>
            {business && (
              <div className="flex flex-wrap gap-4 border-t border-[color:var(--line)] pt-3">
                <Link
                  href={`/admin/listings/${business.id}`}
                  className="text-xs font-bold text-[color:var(--lajvard)] hover:underline"
                >
                  پرونده کسب‌وکار
                </Link>
                {business.slug && (
                  <Link
                    href={`/businesses/${business.slug}`}
                    target="_blank"
                    className="text-xs font-bold text-[color:var(--lajvard)] hover:underline"
                  >
                    صفحه عمومی
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {claim.note && (
        <Card className="admin-panel-card">
          <div className="panel-header flex items-center gap-2 border-b border-[color:var(--line)] px-6 pb-4 pt-6">
            <Info size={18} className="text-[color:var(--lajvard)]" />
            <h2 className="text-lg font-bold">یادداشت</h2>
          </div>
          <CardContent className="pt-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--text)]">
              {claim.note as string}
            </p>
          </CardContent>
        </Card>
      )}

      {!isPending && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4 text-sm">
          {claim.status === "approved" ? (
            <ShieldCheck size={16} className="text-green-600" />
          ) : (
            <XCircle size={16} className="text-red-600" />
          )}
          <span className="font-bold">
            {claim.status === "approved" ? "تایید شده" : "رد شده"}
          </span>
          <span className="text-[color:var(--muted-text)]">
            در <span dir="ltr">{dateTime(claim.reviewed_at as string)}</span>
            {reviewer ? ` توسط ${person(reviewer)}` : ""}
          </span>
        </div>
      )}

      {isPending && business && <ClaimDecision claimId={claim.id as string} />}
      {isPending && !business && (
        <p className="flex items-center gap-2 text-sm text-[color:var(--muted-text)]">
          <Clock size={14} /> تا وقتی کسب‌وکار وجود نداشته باشد، تصمیم‌گیری ممکن نیست.
        </p>
      )}
    </div>
  );
}

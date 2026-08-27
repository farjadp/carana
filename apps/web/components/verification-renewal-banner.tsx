// ============================================================================
// Source: components/verification-renewal-banner.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The owner-facing half of the six-month rule. The countdown is visible
//      from day one here, because for the owner it is an obligation with a
//      date — not a reassurance.
// Env / Identity: Client. Renewal re-runs the original proof; it is never a
//      single button that simply extends the date.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, ShieldX, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { toLatinDigits } from "@goplaza/core";

import { startRenewal, confirmBusinessClaim, verifyOwnListing } from "@/lib/verification/actions";
import { getVerificationStatus, type VerifiableBusiness } from "@/lib/verification/status";
import { faNumber } from "@/components/verification-badge";

export function VerificationRenewalBanner({
  business,
  contactVerified,
}: {
  business: VerifiableBusiness & { id: string; name: string };
  /**
   * Whether this account has already proven its own email AND mobile.
   * Passed in rather than discovered by clicking: `verifyOwnListing` refuses
   * without both, and a button that can only fail is not an offer.
   */
  contactVerified?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const status = getVerificationStatus(business);

  const renew = () => {
    startTransition(async () => {
      const result = await startRenewal(business.id);
      if (!result.success) {
        toast.error(result.error ?? "خطایی رخ داد.");
        return;
      }
      if (result.method === "claimed") {
        setMaskedPhone(result.maskedPhone ?? null);
        setAwaitingCode(true);
        toast.success("کد تمدید به شماره‌ی آگهی پیامک شد.");
      } else {
        toast.success("تایید شما تمدید شد.");
        router.refresh();
      }
    });
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await confirmBusinessClaim(business.id, code);
      if (!result.success) {
        toast.error(result.error ?? "خطایی رخ داد.");
        return;
      }
      toast.success("تایید شما برای شش ماه دیگر تمدید شد.");
      setAwaitingCode(false);
      setCode("");
      router.refresh();
    });
  };

  const selfVerify = () => {
    startTransition(async () => {
      const result = await verifyOwnListing(business.id);
      if (!result.success) {
        toast.error(result.error ?? "خطایی رخ داد.");
        return;
      }
      toast.success(result.message ?? "کسب‌وکار شما تایید شد.");
      router.refresh();
    });
  };

  // Never verified. This branch used to return null on the assumption that
  // onboarding had already granted the badge — it never did: `verifyOwnListing`
  // existed on the server with no caller anywhere in the app, so a listing the
  // owner registered themselves could not be verified by any route. The three
  // oldest listings on the directory sat unverified for that reason alone.
  if (status.state === "unverified") {
    return (
      <div className="rounded-2xl border border-[#c9a24b]/40 bg-[#c9a24b]/10 p-4 text-[#14213d]" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[#c9a24b]" />
            <div>
              <p className="font-bold">این کسب‌وکار هنوز تایید نشده است</p>
              <p className="mt-0.5 text-sm opacity-80">
                {contactVerified === false
                  ? "برای گرفتن نشان تایید، اول باید ایمیل و شماره موبایل حساب خودت تایید شده باشد."
                  : "نشان تایید یعنی ایمیل و شماره موبایل صاحب این کسب‌وکار تایید شده است. هر شش ماه باید تمدید شود."}
              </p>
            </div>
          </div>

          {contactVerified === false ? (
            <Link
              href="/dashboard/verify-contact"
              className="rounded-lg border border-[rgba(20,33,61,0.15)] px-4 py-2 text-sm font-bold"
            >
              تایید ایمیل و موبایل
            </Link>
          ) : (
            <button
              onClick={selfVerify}
              disabled={pending}
              className="rounded-lg bg-[#7A1831] px-4 py-2 text-sm font-bold text-[#f6f1e8] disabled:opacity-60"
            >
              {pending ? "در حال بررسی…" : "تایید این کسب‌وکار"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const tone =
    status.state === "expired"
      ? "border-red-200 bg-red-50 text-red-900"
      : status.state === "superseded"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : status.state === "expiring"
          ? "border-[#c9a24b] bg-[#c9a24b]/10 text-[#14213d]"
          // Green, not white. Every other state had a colour and this one did
          // not, so after a successful verification the card kept a box of the
          // same size, shape and colour in the same place — which reads as
          // "nothing happened", and was reported as exactly that.
          : "border-emerald-200 bg-emerald-50 text-emerald-900";

  const Icon =
    status.state === "expired"
      ? ShieldX
      : status.state === "superseded"
        ? ShieldAlert
        : status.state === "expiring"
          ? Clock
          : BadgeCheck;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`} dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">
              {status.state === "expired" && "تایید این کسب‌وکار منقضی شده است"}
              {status.state === "superseded" && "اطلاعات تماس تغییر کرده است"}
              {status.state === "expiring" && "زمان تمدید تایید نزدیک است"}
              {status.state === "verified" && "این کسب‌وکار تاییدشده است"}
            </p>
            <p className="mt-0.5 text-sm opacity-80">
              {status.state === "superseded" ? (
                "شماره تماس یا ایمیل پس از تایید عوض شده، بنابراین نشان تایید تا احراز دوباره نمایش داده نمی‌شود."
              ) : status.daysRemaining !== null && status.daysRemaining > 0 ? (
                <>
                  {faNumber(status.daysRemaining)} روز تا تمدید اجباری
                  {status.state === "verified" && " — کاری لازم نیست"}
                </>
              ) : (
                `${faNumber(status.daysRemaining ?? 0)} روز از مهلت گذشته — نشان تایید روی صفحه نمایش داده نمی‌شود`
              )}
            </p>
          </div>
        </div>

        {(status.canRenew || status.state === "superseded") && !awaitingCode && (
          <button
            onClick={renew}
            disabled={pending}
            className="rounded-lg bg-[#7A1831] px-4 py-2 text-sm font-bold text-[#f6f1e8] disabled:opacity-60"
          >
            {pending ? "در حال ارسال…" : "تمدید تایید"}
          </button>
        )}
      </div>

      {awaitingCode && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-current/10 pt-4">
          <span className="text-sm opacity-80">
            کد به {maskedPhone ?? "شماره‌ی آگهی"} پیامک شد
          </span>
          <input
            value={code}
            // toLatinDigits first. The app forces RTL, so the code arrives in
            // Persian digits, and \D would strip every one of them — the box
            // stays empty and the server answers «کد باید ۶ رقم باشد».
            onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder="۶ رقم"
            className="w-32 rounded-lg border border-[rgba(20,33,61,0.15)] px-3 py-2 text-center font-mono tracking-widest"
          />
          <button
            onClick={confirm}
            disabled={pending || code.length !== 6}
            className="rounded-lg bg-[#7A1831] px-4 py-2 text-sm font-bold text-[#f6f1e8] disabled:opacity-40"
          >
            تایید
          </button>
        </div>
      )}
    </div>
  );
}

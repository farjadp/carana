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
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, ShieldX, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { startRenewal, confirmBusinessClaim } from "@/lib/verification/actions";
import { getVerificationStatus, type VerifiableBusiness } from "@/lib/verification/status";
import { faNumber } from "@/components/verification-badge";

export function VerificationRenewalBanner({
  business,
}: {
  business: VerifiableBusiness & { id: string; name: string };
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

  // Not verified at all — nothing to renew, and the onboarding flow is the
  // right prompt, not this banner.
  if (status.state === "unverified") return null;

  const tone =
    status.state === "expired"
      ? "border-red-200 bg-red-50 text-red-900"
      : status.state === "superseded"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : status.state === "expiring"
          ? "border-[#c9a24b] bg-[#c9a24b]/10 text-[#14213d]"
          : "border-[rgba(20,33,61,0.10)] bg-white text-[#14213d]";

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
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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

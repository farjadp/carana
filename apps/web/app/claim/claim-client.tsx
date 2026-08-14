// ============================================================================
// Source: app/claim/claim-client.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The two-step claim: request a code to the listed number, then enter it.
// Env / Identity: Client. The destination number is never sent from here —
//      the server reads it from the listing, and only a masked form of it
//      comes back. A claimant who could name the destination would be
//      asserting ownership rather than proving it.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { startBusinessClaim, confirmBusinessClaim } from "@/lib/verification/actions";
import { faNumber } from "@/components/verification-badge";

export default function ClaimClient({
  businessId,
  businessName,
  hasPhone,
}: {
  businessId: string;
  businessName: string;
  hasPhone: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!hasPhone) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <p className="mb-1 font-bold">این آگهی شماره تلفن ندارد</p>
        <p>
          احراز مالکیت با پیامک ممکن نیست. لطفاً از طریق{" "}
          <Link href="/contact" className="font-medium underline">
            پشتیبانی
          </Link>{" "}
          اقدام کنید تا به‌صورت دستی بررسی شود.
        </p>
      </div>
    );
  }

  const request = () => {
    setError(null);
    startTransition(async () => {
      const result = await startBusinessClaim(businessId);
      if (!result.success) {
        setError(result.error ?? "خطایی رخ داد.");
        return;
      }
      setMaskedPhone(result.maskedPhone ?? null);
      setStep("code");
      toast.success(result.message ?? "کد ارسال شد.");
    });
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await confirmBusinessClaim(businessId, code);
      if (!result.success) {
        setError(result.error ?? "خطایی رخ داد.");
        return;
      }
      toast.success("مالکیت شما احراز شد.");
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[#14213d]">
          <ShieldCheck size={18} className="text-[#800000]" />
          چطور مالکیت احراز می‌شود
        </h2>
        <p className="text-sm leading-relaxed text-[#5f6472]">
          ما یک کد شش‌رقمی به <strong>همان شماره‌ای که در این آگهی منتشر شده</strong>{" "}
          پیامک می‌کنیم. شما این شماره را انتخاب نمی‌کنید — از خود آگهی خوانده می‌شود.
          به همین دلیل، دریافت کد یعنی شما به آن خط دسترسی دارید و صاحب واقعی این
          کسب‌وکار هستید.
        </p>
      </div>

      {step === "intro" ? (
        <button
          onClick={request}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#800000] px-4 py-3 font-bold text-[#f6f1e8] transition disabled:opacity-60"
        >
          <MessageSquare size={18} />
          {pending ? "در حال ارسال…" : "ارسال کد به شماره‌ی آگهی"}
        </button>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white p-5">
          <p className="text-sm text-[#5f6472]">
            کد به شماره‌ی {maskedPhone ?? "ثبت‌شده"} پیامک شد. کد تا{" "}
            {faNumber(15)} دقیقه معتبر است.
          </p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="۶ رقم"
            dir="ltr"
            className="w-full rounded-xl border border-[rgba(20,33,61,0.15)] px-4 py-3 text-center font-mono text-2xl tracking-[0.4em]"
          />

          <button
            onClick={confirm}
            disabled={pending || code.length !== 6}
            className="w-full rounded-xl bg-[#800000] px-4 py-3 font-bold text-[#f6f1e8] transition disabled:opacity-40"
          >
            {pending ? "در حال بررسی…" : "تایید و احراز مالکیت"}
          </button>

          <button
            onClick={request}
            disabled={pending}
            className="w-full text-sm text-[#0047ab] underline disabled:opacity-50"
          >
            ارسال دوباره‌ی کد
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <p className="text-xs leading-relaxed text-[#5f6472]">
        پس از احراز، «{businessName}» به داشبورد شما اضافه می‌شود و نشان تایید روی
        صفحه‌اش نمایش داده خواهد شد. این تایید شش ماه اعتبار دارد و پس از آن باید
        تمدید شود.
      </p>
    </div>
  );
}

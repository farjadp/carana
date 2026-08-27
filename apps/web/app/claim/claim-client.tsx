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

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { startBusinessClaim, confirmBusinessClaim } from "@/lib/verification/actions";
import { faNumber } from "@/components/verification-badge";

/** Persian / Arabic-Indic digits → ASCII. The forced-RTL keyboard trap. */
const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export default function ClaimClient({
  businessId,
  businessName,
  hasPhone,
  maskedPhone: initialMasked = null,
}: {
  businessId: string;
  businessName: string;
  hasPhone: boolean;
  maskedPhone?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"intro" | "code" | "done">("intro");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(initialMasked);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
      setMaskedPhone(result.maskedPhone ?? initialMasked);
      setStep("code");
      setCooldown(60);
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
      setStep("done");
      router.refresh();
    });
  };

  if (step === "done") {
    return (
      <div className="mt-6 rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3"><ShieldCheck size={26} /></div>
        <div className="text-xl font-black text-emerald-900">مالکیت «{businessName}» احراز شد</div>
        <p className="text-sm text-emerald-900/80 mt-1 leading-relaxed">نشان تایید همین حالا روی پروفایل است و شش ماه اعتبار دارد. سی روز قبل از پایان، برای تمدید ایمیل می‌فرستیم.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/dashboard/business" className="rounded-xl bg-[#7A1831] px-4 py-2.5 font-bold text-[#f6f1e8]">ویرایش پروفایل کسب‌وکار</Link>
          <button onClick={() => router.push("/")} className="rounded-xl bg-white border border-emerald-200 px-4 py-2.5 font-bold text-emerald-900">بازگشت به پلازا</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[#14213d]">
          <ShieldCheck size={18} className="text-[#7A1831]" />
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1831] px-4 py-3 font-bold text-[#f6f1e8] transition disabled:opacity-60"
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
            onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="۶ رقم"
            dir="ltr"
            className="w-full rounded-xl border border-[rgba(20,33,61,0.15)] px-4 py-3 text-center font-mono text-2xl tracking-[0.4em]"
          />

          <button
            onClick={confirm}
            disabled={pending || code.length !== 6}
            className="w-full rounded-xl bg-[#7A1831] px-4 py-3 font-bold text-[#f6f1e8] transition disabled:opacity-40"
          >
            {pending ? "در حال بررسی…" : "تایید و احراز مالکیت"}
          </button>

          <button
            onClick={request}
            disabled={pending || cooldown > 0}
            className="w-full text-sm text-[#0047ab] underline disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0 ? `ارسال دوباره تا ${faNumber(cooldown)} ثانیه دیگر` : "ارسال دوباره‌ی کد"}
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

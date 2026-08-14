// ============================================================================
// Source: app/dashboard/verify-contact/verify-contact-client.tsx
// Version: 1.0.0 — 2026-08-20
// Why: Interactive half of the contact-verification page.
// Env / Identity: Client component. Split out of page.tsx because that file was
//      marked "use client" while importing PageShell, which pulls next/headers
//      into the browser bundle and breaks the production build.
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Mail, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendVerificationCode, verifyCode } from "./actions";

export function VerifyContactClient() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"email" | "phone">("phone");

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(false);

  const handleSendCode = async (type: "email" | "phone") => {
    setIsSending(true);
    const result = await sendVerificationCode(type);
    setIsSending(false);

    if (result.success) {
      toast.success(result.message);
      setCodeSent(true);
    } else {
      toast.error(result.error);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    const result = await verifyCode(activeTab, code);
    setIsVerifying(false);

    if (result.success) {
      toast.success(`تایید ${activeTab === "phone" ? "موبایل" : "ایمیل"} با موفقیت انجام شد.`);
      setCodeSent(false);
      setCode("");

      if (activeTab === "phone") setVerifiedPhone(true);
      if (activeTab === "email") setVerifiedEmail(true);
    } else {
      toast.error(result.error);
    }
  };

  const allVerified = verifiedPhone && verifiedEmail;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-black text-amber-900 mb-2">اعتبارسنجی دوره‌ای</h1>
          <p className="text-sm text-amber-800/80 leading-relaxed max-w-sm mx-auto">
            جهت حفظ امنیت و کیفیت اطلاعات چارانا، تایید موبایل و ایمیل هر ۶ ماه یکبار برای ثبت یا ویرایش کسب‌وکار الزامی است.
          </p>
        </div>

        <div className="p-6 md:p-8">
          {allVerified ? (
            <div className="text-center py-8">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">تبریک! حساب شما تایید شد.</h2>
              <p className="text-gray-500 text-sm mb-6">حالا می‌توانید به راحتی کسب‌وکار خود را ثبت یا ویرایش کنید.</p>
              <Button onClick={() => router.push("/dashboard/business/new")} className="w-full">
                ادامه ثبت کسب‌وکار
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => {
                    setActiveTab("phone");
                    setCodeSent(false);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                    activeTab === "phone"
                      ? "bg-[color:var(--lajvard)] text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Phone size={18} /> تایید موبایل{" "}
                  {verifiedPhone && <CheckCircle2 size={16} className="text-green-400" />}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("email");
                    setCodeSent(false);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                    activeTab === "email"
                      ? "bg-[color:var(--lajvard)] text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Mail size={18} /> تایید ایمیل{" "}
                  {verifiedEmail && <CheckCircle2 size={16} className="text-green-400" />}
                </button>
              </div>

              {(activeTab === "phone" && verifiedPhone) ||
              (activeTab === "email" && verifiedEmail) ? (
                <div className="bg-green-50 text-green-800 p-4 rounded-xl text-center text-sm font-medium border border-green-100">
                  این بخش با موفقیت تایید شده است. لطفاً بخش دیگر را تایید کنید.
                </div>
              ) : (
                <div className="space-y-6">
                  {!codeSent ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        برای دریافت کد تایید ۶ رقمی روی دکمه زیر کلیک کنید.
                      </p>
                      <Button
                        onClick={() => handleSendCode(activeTab)}
                        disabled={isSending}
                        className="w-full h-12"
                      >
                        {isSending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          `دریافت کد ${activeTab === "phone" ? "موبایل" : "ایمیل"}`
                        )}
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerify} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          کد تایید ۶ رقمی
                        </label>
                        <Input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          dir="ltr"
                          maxLength={6}
                          placeholder="------"
                          className="text-center text-2xl tracking-[0.5em] h-14 rounded-xl"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isVerifying || code.length < 6}
                        className="w-full h-12 bg-green-600 hover:bg-green-700"
                      >
                        {isVerifying ? <Loader2 className="animate-spin" /> : "تایید کد"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleSendCode(activeTab)}
                        className="w-full text-xs text-blue-600 font-bold mt-2"
                      >
                        ارسال مجدد کد
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

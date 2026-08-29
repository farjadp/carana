// ============================================================================
// Source: app/dashboard/verify-contact/verify-contact-client.tsx
// Version: 2.0.0 — 2026-08-27
// Why: One screen that finishes both verifications without sending anyone
//      anywhere else.
//
//      v1 had two tabs and a single button that mailed or texted a code. Two
//      things went wrong with it, both visible in system_errors:
//
//      1. The phone tab texted `profiles.mobile_number` and there was no field
//         to enter one. Someone with no number on file got «ابتدا شماره موبایل
//         خود را در پروفایل ثبت کنید» and no link to that page — eleven of the
//         sixteen recorded code failures, one person pressing it four times.
//         The field is on this page now.
//      2. It rendered from client state that started at "nothing verified", so
//         it could not tell anyone which step was actually left. Real state
//         comes from the server now.
//
//      Everything else here is the same job written to explain itself: what
//      this page is for, which step you are on, what to type, and who to write
//      to when it still will not work.
// Env / Identity: Client. Every write is a server action that re-checks the
//      session.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { company } from "@/lib/data/company";
import { toLatinDigits } from "@goplaza/core";

import { saveMobileNumber, sendVerificationCode, verifyCode } from "./actions";

type Props = {
  email: string | null;
  mobile: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
};

type Channel = "email" | "phone";

export function VerifyContactClient({ email, mobile, emailVerified, phoneVerified }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [doneEmail, setDoneEmail] = useState(emailVerified);
  const [donePhone, setDonePhone] = useState(phoneVerified);
  const [savedMobile, setSavedMobile] = useState(mobile);

  /** Which channel currently has a code in flight. */
  const [awaiting, setAwaiting] = useState<Channel | null>(null);
  const [code, setCode] = useState("");
  const [mobileDraft, setMobileDraft] = useState(mobile ?? "");
  const [askMobile, setAskMobile] = useState(!mobile);
  const [failures, setFailures] = useState(0);

  const allDone = doneEmail && donePhone;

  const send = (channel: Channel) =>
    start(async () => {
      const result = await sendVerificationCode(channel);
      if (result.success) {
        setAwaiting(channel);
        setCode("");
        setFailures(0);
        toast.success(result.message ?? "کد فرستاده شد.");
        return;
      }
      // The one refusal that has a fix on this very page.
      if ("needsMobile" in result && result.needsMobile) setAskMobile(true);
      setFailures((n) => n + 1);
      toast.error(result.error);
    });

  const confirm = (channel: Channel) =>
    start(async () => {
      const result = await verifyCode(channel, code);
      if (!result.success) {
        setFailures((n) => n + 1);
        toast.error(result.error);
        return;
      }
      toast.success(channel === "phone" ? "موبایلت تایید شد." : "ایمیلت تایید شد.");
      if (channel === "phone") setDonePhone(true);
      else setDoneEmail(true);
      setAwaiting(null);
      setCode("");
      setFailures(0);
      router.refresh();
    });

  const saveMobile = () =>
    start(async () => {
      const result = await saveMobileNumber(mobileDraft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSavedMobile(result.mobile);
      setAskMobile(false);
      setDonePhone(false);
      toast.success("شماره ذخیره شد. حالا کد را می‌فرستیم.");
      const sent = await sendVerificationCode("phone");
      if (sent.success) {
        setAwaiting("phone");
        setCode("");
        toast.success(sent.message ?? "کد پیامک شد.");
      } else {
        toast.error(sent.error);
      }
    });

  return (
    <main className="page-main" dir="rtl">
      <div className="mx-auto max-w-xl">
        {/* What is happening and why — the page used to open on «اعتبارسنجی
            دوره‌ای» with no statement of what it unlocks. */}
        <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">
          دو تایید کوتاه، بعد کسب‌وکارت را ثبت کن
        </h1>
        <p className="mt-3 text-sm leading-8 text-[color:var(--muted-text)]">
          برای ثبت یا ویرایش کسب‌وکار، باید ایمیل و شماره موبایلت را یک‌بار تایید کنیم — و هر
          شش ماه یک‌بار دوباره. این تنها کاری است که مانده؛ هر قدم یک کد شش‌رقمی است و کمتر
          از یک دقیقه طول می‌کشد.
        </p>

        {allDone ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
            <h2 className="mt-3 text-lg font-black text-emerald-900">هر دو تایید شد.</h2>
            <p className="mt-1 text-sm text-emerald-800/80">حالا می‌توانی کسب‌وکارت را ثبت کنی.</p>
            <Button className="mt-5 w-full" onClick={() => router.push("/dashboard/business/new")}>
              ادامه‌ی ثبت کسب‌وکار <ArrowLeft size={16} />
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <Step
              icon={<Mail size={18} />}
              label="ایمیل"
              value={email}
              done={doneEmail}
              awaiting={awaiting === "email"}
              pending={pending}
              code={code}
              setCode={setCode}
              onSend={() => send("email")}
              onConfirm={() => confirm("email")}
              sentNote={`کد به ${email ?? "ایمیلت"} فرستاده شد. اگر نیامد، پوشه‌ی spam را هم ببین.`}
            />

            <Step
              icon={<Phone size={18} />}
              label="موبایل"
              value={savedMobile}
              done={donePhone}
              awaiting={awaiting === "phone"}
              pending={pending}
              code={code}
              setCode={setCode}
              onSend={() => (savedMobile ? send("phone") : setAskMobile(true))}
              hideSend={askMobile}
              onConfirm={() => confirm("phone")}
              sentNote={`کد به ${savedMobile ?? "موبایلت"} پیامک شد.`}
            >
              {askMobile ? (
                <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-4">
                  <label className="block text-xs font-bold text-[color:var(--text)]" htmlFor="mobile">
                    {savedMobile ? "شماره‌ی تازه" : "شماره موبایلت را بنویس"}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-[color:var(--muted-text)]">
                    شماره‌ی کانادایی، با یا بدون +۱. فقط برای همین تایید و تماس پشتیبانی است و
                    روی آگهی نمایش داده نمی‌شود.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      id="mobile"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+1 416 555 0123"
                      value={mobileDraft}
                      onChange={(e) => setMobileDraft(toLatinDigits(e.target.value))}
                      className="min-w-[190px] flex-1"
                    />
                    <Button onClick={saveMobile} disabled={pending || mobileDraft.trim().length < 10}>
                      {pending ? <Loader2 className="animate-spin" size={16} /> : "ذخیره و ارسال کد"}
                    </Button>
                  </div>
                </div>
              ) : savedMobile ? (
                <button
                  type="button"
                  onClick={() => setAskMobile(true)}
                  className="mt-2 text-xs font-bold text-[color:var(--lajvard)] hover:underline"
                >
                  شماره اشتباه است؟ عوضش کن
                </button>
              ) : null}
            </Step>
          </div>
        )}

        {/* The way out, shown once something has actually gone wrong twice —
            not a permanent "contact us" that implies the page is unreliable. */}
        {failures >= 2 && !allDone ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-5">
            <p className="text-sm font-black text-[color:var(--text)]">هنوز جواب نداد؟</p>
            <p className="mt-1.5 text-sm leading-8 text-[color:var(--text)]/80">
              برای ما بنویس و بگو با کدام ایمیل ثبت‌نام کرده‌ای و کدام قدم گیر کرده — همین را
              دستی برایت انجام می‌دهیم. لازم نیست چیز دیگری بفرستی.
            </p>
            <a
              href={`mailto:${company.email.support}?subject=${encodeURIComponent("تایید ایمیل یا موبایل")}`}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[color:var(--annabi)] px-4 text-sm font-black text-[#f6f1e8]"
              dir="ltr"
            >
              {company.email.support}
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Step({
  icon, label, value, done, awaiting, pending, code, setCode, onSend, onConfirm, sentNote, hideSend, children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  done: boolean;
  awaiting: boolean;
  pending: boolean;
  code: string;
  setCode: (v: string) => void;
  onSend: () => void;
  onConfirm: () => void;
  sentNote: string;
  /** The step already shows its own action inline; a second one would be noise. */
  hideSend?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 ${done ? "border-emerald-200 bg-emerald-50/60" : "border-[color:var(--line)] bg-white"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl ${done ? "bg-emerald-100 text-emerald-700" : "bg-[color:var(--lajvard)]/8 text-[color:var(--lajvard)]"}`}
          >
            {done ? <BadgeCheck size={18} /> : icon}
          </span>
          <div className="min-w-0">
            <div className="font-black text-[color:var(--text)]">{label}</div>
            <div className="truncate text-xs text-[color:var(--muted-text)]" dir="ltr">
              {value ?? "—"}
            </div>
          </div>
        </div>

        {done ? (
          <span className="text-xs font-black text-emerald-700">تایید شد</span>
        ) : awaiting || hideSend ? null : (
          <Button variant="muted" onClick={onSend} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={16} /> : "ارسال کد"}
          </Button>
        )}
      </div>

      {!done && awaiting ? (
        <div className="mt-4 border-t border-[color:var(--line)] pt-4">
          <p className="text-xs leading-6 text-[color:var(--muted-text)]">{sentNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="۶ رقم"
              value={code}
              // toLatinDigits: the keyboard opens in Persian and the server
              // checks /^\d{6}$/ — this is the fourth place that trap appeared.
              onChange={(e) => setCode(toLatinDigits(e.target.value).replace(/\D/g, "").slice(0, 6))}
              className="w-32 text-center font-mono tracking-widest"
            />
            <Button onClick={onConfirm} disabled={pending || code.length !== 6}>
              {pending ? <Loader2 className="animate-spin" size={16} /> : "تایید"}
            </Button>
            <Button variant="muted" onClick={onSend} disabled={pending}>
              ارسال دوباره
            </Button>
          </div>
        </div>
      ) : null}

      {!done ? children : null}
    </section>
  );
}

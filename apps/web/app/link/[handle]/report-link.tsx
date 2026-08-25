"use client";

// ============================================================================
// Source: app/link/[handle]/report-link.tsx
// Version: 1.0.0 — 2026-08-25
// Why: A bio page needs a way for a stranger to say "this is a scam". Without
//      one, the only people who could see abuse were the people committing it.
//
//      DELIBERATELY SMALL. Three reasons, not the profile dialog's eight —
//      the ones that describe what can actually go wrong on a page whose
//      contact details are mirrored from a moderated listing: the page is
//      pretending to be someone, it is a scam, or its wording is abusive. A
//      long menu on a short page invites the wrong report and buries the
//      right one.
//
//      It posts to the same /api/reports endpoint and lands in the same admin
//      queue as a listing report. A second queue is the one nobody opens.
//
//      The button claims only what it does: the toast says the report was
//      recorded, not that anything will be removed. The profile's report
//      button once showed a toast and wrote nothing at all, which is the
//      exact failure this project keeps auditing for.
// Env / Identity: Client. Anonymous reporting is the point — someone finding
//      a fraudulent page must not have to register first. The endpoint is
//      rate-limited and attributes a session when one exists.
// ============================================================================
import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  { value: "impersonation", label: "جای شخص یا کسب‌وکار دیگری را گرفته" },
  { value: "spam", label: "کلاهبرداری یا اسپم" },
  { value: "offensive", label: "محتوای توهین‌آمیز" },
] as const;

export function ReportLinkPage({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ linkPageId: pageId, reason, details, source: "web" }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!json.success) {
          toast.error(json.error ?? "ثبت گزارش ناموفق بود.");
          return;
        }
        setSent(true);
        setOpen(false);
        toast.success("گزارش ثبت شد. یک نفر آن را می‌بیند.");
      } catch {
        toast.error("ثبت گزارش ناموفق بود.");
      }
    });

  if (sent) {
    return (
      <p className="mt-6 text-center text-[11px] text-[#5f6472]">
        گزارش شما ثبت شد.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="mt-6 text-center">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5f6472] transition hover:text-[#7A1831]"
        >
          <Flag size={11} /> گزارش این صفحه
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white p-4 text-right">
      <p className="text-[13px] font-black text-[#14213d]">مشکل این صفحه چیست؟</p>
      <div className="mt-3 space-y-1.5">
        {REASONS.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-[12px] transition ${
              reason === r.value
                ? "border-[#7A1831]/40 bg-[#7A1831]/5"
                : "border-[rgba(20,33,61,0.10)] hover:bg-[#f6f1e8]"
            }`}
          >
            <input
              type="radio"
              name="link-report-reason"
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="accent-[#7A1831]"
            />
            <span className="text-[#14213d]">{r.label}</span>
          </label>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="توضیح (اختیاری)"
        className="mt-3 w-full resize-none rounded-xl border border-[rgba(20,33,61,0.10)] px-3 py-2 text-[12px] focus:outline-none"
      />
      <div className="mt-3 flex gap-2">
        <button
          disabled={!reason || pending}
          onClick={submit}
          className="flex-1 rounded-xl bg-[#7A1831] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40"
        >
          ارسال گزارش
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2 text-[12px] font-bold text-[#5f6472]"
        >
          انصراف
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Source: components/business/correction-dialog.tsx
// Version: 1.0.0 — 2026-08-26
// Why: «اطلاعات این کسب‌وکار درست نیست؟» — propose a VALUE, not a complaint.
//
//      The report dialog next to this one already lets someone say "wrong
//      info" in prose, which an admin then reads and retypes. This asks for
//      the correct value instead, which is what makes the contribution
//      checkable — and checkable is the whole basis of «اعتبار مشارکت»: a
//      proposal either survives review or it does not.
//
//      The response tells the person which of the two things happened, and
//      never promises the other. A معتمد's hours correction is live
//      immediately; everyone else's is queued, and the copy says queued.
// Env / Identity: Client. Signed-in only — the API refuses anonymous, and the
//      button says so rather than opening a form that will fail.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PencilLine } from "lucide-react";

import { CORRECTABLE_LABELS_FA, type CorrectableField } from "@goplaza/core";

/** working_hours is an object; the rest are plain strings. Only offer the
 *  ones a person can sensibly type into a single box. */
const TEXT_FIELDS: CorrectableField[] = [
  "phone",
  "website",
  "instagram",
  "telegram",
  "booking_url",
  "google_maps_url",
  "contact_email",
  "postal_code",
];

export function CorrectionDialog({
  businessId,
  signedIn,
}: {
  businessId: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<CorrectableField>("phone");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"applied" | "queued" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--muted-text)] hover:underline"
      >
        <PencilLine size={13} /> برای پیشنهاد اصلاح، وارد شو
      </Link>
    );
  }

  const submit = () =>
    start(async () => {
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/corrections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, field, proposed: value.trim(), note: note.trim() || undefined }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; applied?: boolean };
        if (!res.ok) throw new Error(json.error || "ثبت نشد.");
        setResult(json.applied ? "applied" : "queued");
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  if (result) {
    return (
      <p className="text-xs font-bold text-[color:var(--success,#0f7b4f)]">
        {result === "applied"
          ? "اصلاح تو مستقیم اعمال شد."
          : "پیشنهادت ثبت شد و در صف بررسی است."}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--muted-text)] hover:underline"
      >
        <PencilLine size={13} /> اطلاعاتی اشتباه است؟ مقدار درست را پیشنهاد بده
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={field}
        onChange={(e) => setField(e.target.value as CorrectableField)}
        className="h-9 w-full rounded-lg border border-[color:var(--line)] bg-white px-2 text-sm"
      >
        {TEXT_FIELDS.map((f) => (
          <option key={f} value={f}>
            {CORRECTABLE_LABELS_FA[f]}
          </option>
        ))}
      </select>
      <input
        dir="ltr"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="مقدار درست"
        className="h-9 w-full rounded-lg border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="توضیح (اختیاری) — از کجا می‌دانی؟"
        className="h-9 w-full rounded-lg border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending || value.trim().length < 2}
          onClick={submit}
          className="h-9 rounded-full bg-[color:var(--text)] px-4 text-xs font-bold text-[#f6f1e8] disabled:opacity-40"
        >
          {pending ? "…" : "ارسال"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-[color:var(--muted-text)]"
        >
          انصراف
        </button>
      </div>
      {error && <p className="text-xs font-bold text-red-600">{error}</p>}
      <p className="text-[11px] text-[color:var(--muted-text)]">
        پیشنهاد تو پیش از انتشار بررسی می‌شود.
      </p>
    </div>
  );
}

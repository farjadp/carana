// ============================================================================
// Source: components/business/report-dialog.tsx
// Version: 1.1.0 — 2026-08-26
// Why: "این اطلاعات درست نیست" — a real report, posted to /api/reports and
//      queued for an admin. The previous button raised a toast and wrote
//      nothing; nothing here claims more than happened.
//      v1.1 (26 Aug): also reports a channel entry. Same endpoint, same
//      queue — a second queue is the one nobody opens. It matters more in
//      that section than anywhere else on the site: almost every number
//      there is a claim nobody can verify, so a report is the only quality
//      control that exists.
// Env / Identity: Client component. No sign-in required.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Flag, X } from "lucide-react";

type Reason = { value: string; label: string; hint?: string };

const BUSINESS_REASONS: Reason[] = [
  { value: "closed", label: "این کسب‌وکار تعطیل شده است" },
  { value: "wrong_info", label: "اطلاعات اشتباه است", hint: "شماره، آدرس، ساعت کاری یا دسته" },
  { value: "duplicate", label: "تکراری است", hint: "همین کسب‌وکار دو بار ثبت شده" },
  { value: "not_iranian", label: "کسب‌وکار ایرانی نیست" },
  { value: "spam", label: "تبلیغ یا اسپم است" },
  { value: "offensive", label: "محتوای نامناسب دارد" },
  { value: "impersonation", label: "جعل هویت است", hint: "به نام کس دیگری ثبت شده" },
  { value: "other", label: "مورد دیگر" },
];

// The same stored `reason` values, worded for a channel. A separate vocabulary
// would mean a second set of labels in the admin queue for no gain — «تعطیل
// شده» and «دیگر وجود ندارد» are the same fact about two kinds of thing.
const CHANNEL_REASONS: Reason[] = [
  { value: "closed", label: "لینک کار نمی‌کند یا کانال دیگر وجود ندارد" },
  { value: "wrong_info", label: "اطلاعاتش اشتباه است", hint: "موضوع، شهر یا توضیحش با واقعیت نمی‌خواند" },
  { value: "duplicate", label: "تکراری است", hint: "همین کانال دو بار ثبت شده" },
  { value: "spam", label: "تبلیغ یا اسپم است" },
  { value: "offensive", label: "محتوای نامناسب دارد" },
  { value: "impersonation", label: "جعل هویت است", hint: "خودش را جای کانال دیگری جا زده" },
  { value: "other", label: "مورد دیگر" },
];

/**
 * Exactly one subject. The endpoint enforces it too — this is the shape that
 * makes passing both impossible to write rather than merely wrong.
 */
export type ReportSubject =
  | { kind: "business"; id: string; name: string }
  | { kind: "channel"; id: string; name: string };

export function ReportDialog({ subject }: { subject: ReportSubject }) {
  const REASONS = subject.kind === "channel" ? CHANNEL_REASONS : BUSINESS_REASONS;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(subject.kind === "business" ? { businessId: subject.id } : { channelId: subject.id }),
          reason,
          details,
          contact,
          source: "web",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "ثبت گزارش ناموفق بود.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت گزارش ناموفق بود.");
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    setOpen(false);
    // Reset a moment later so the panel does not flicker while it fades.
    setTimeout(() => {
      setDone(false);
      setReason("");
      setDetails("");
      setContact("");
      setError(null);
    }, 200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)] transition hover:text-[color:var(--annabi)]"
      >
        <Flag size={13} /> گزارش مشکل
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#14213d]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={(e) => e.target === e.currentTarget && close()}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="گزارش مشکل" dir="rtl" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-[0_-10px_60px_rgba(20,33,61,0.25)] sm:rounded-3xl">
            {done ? (
              <div className="py-6 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-[color:var(--success,#0f7b4f)]" />
                <h2 className="text-lg font-black text-[color:var(--text)]">گزارش ثبت شد</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[color:var(--muted-text)]">
                  در صف بررسی تیم پلازاست. اگر تغییری لازم باشد اعمال می‌کنیم؛ ممکن است چند روز طول بکشد.
                </p>
                <button type="button" onClick={close} className="mt-5 h-10 rounded-full bg-[color:var(--text)] px-6 text-sm font-bold text-[#f6f1e8]">بستن</button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-[color:var(--text)]">
                      {subject.kind === "channel" ? "مشکلی در این کانال هست؟" : "مشکلی در این آگهی هست؟"}
                    </h2>
                    <p className="mt-1 text-xs text-[color:var(--muted-text)]">{subject.name}</p>
                  </div>
                  <button type="button" onClick={close} aria-label="بستن" className="rounded-lg p-1 text-[color:var(--muted-text)] hover:bg-[color:var(--bg)]"><X size={18} /></button>
                </div>

                <fieldset className="space-y-1.5">
                  <legend className="sr-only">دلیل گزارش</legend>
                  {REASONS.map((r) => (
                    <label key={r.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${reason === r.value ? "border-[color:var(--annabi)]/40 bg-[color:var(--annabi)]/5" : "border-[color:var(--line)] hover:bg-[color:var(--bg)]"}`}>
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-1 accent-[color:var(--annabi)]" />
                      <span>
                        <span className="block text-sm font-bold text-[color:var(--text)]">{r.label}</span>
                        {r.hint ? <span className="block text-xs text-[color:var(--muted-text)]">{r.hint}</span> : null}
                      </span>
                    </label>
                  ))}
                </fieldset>

                <label className="mt-4 block">
                  <span className="mb-1 block text-xs font-bold text-[color:var(--text)]">توضیح {reason === "other" ? "" : "(اختیاری)"}</span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={
                      subject.kind === "channel"
                        ? "مثلاً: لینک دعوت منقضی شده و دیگر باز نمی‌شود."
                        : "مثلاً: شماره‌ی تماس عوض شده، شماره‌ی درست ۴۱۶-۵۵۵-۰۱۲۳ است."
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-2 text-sm leading-7 outline-none focus:border-[color:var(--annabi)]/40 focus:bg-white"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-bold text-[color:var(--text)]">ایمیل یا شماره (اختیاری)</span>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={200}
                    dir="auto"
                    placeholder="اگر خواستید نتیجه را به شما بگوییم"
                    className="h-11 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:border-[color:var(--annabi)]/40 focus:bg-white"
                  />
                </label>

                {error ? <p className="mt-3 text-sm font-bold text-[color:var(--annabi)]">{error}</p> : null}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-5 text-[color:var(--muted-text)]">گزارش‌ها را آدم می‌خواند، نه ربات.</p>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!reason || sending}
                    className="h-11 rounded-full bg-[color:var(--annabi)] px-6 text-sm font-black text-[#f6f1e8] transition hover:bg-[#5A1124] disabled:opacity-40"
                  >
                    {sending ? "در حال ارسال…" : "ارسال گزارش"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

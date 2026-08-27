// ============================================================================
// Source: app/support/support-form.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The support form. Mirrors app/contact/contact-form.tsx — same classes,
//      same honeypot, same success state — so the two never drift into
//      looking like different products. What it adds is the category select,
//      which is what makes the resulting mail triageable.
//
//      The success state says only what actually happened: the message was
//      sent to the support mailbox. It does not invent a ticket number, and
//      it repeats the response time the rest of the page promises.
// ============================================================================
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendSupportMessage } from "./actions";
import { SUPPORT_CATEGORIES } from "./categories";

const CATEGORIES = Object.entries(SUPPORT_CATEGORIES) as [
  keyof typeof SUPPORT_CATEGORIES,
  string,
][];

export function SupportForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await sendSupportMessage(new FormData(e.currentTarget));

    if (result.success) setSent(true);
    else setError(result.error ?? "خطایی رخ داد.");

    setBusy(false);
  }

  if (sent) {
    return (
      <div className="contact-sent">
        <CheckCircle2 size={30} />
        <strong>پیام شما به پشتیبانی رسید</strong>
        <p>معمولاً ظرف یک تا دو روز کاری پاسخ می‌دهیم. پاسخ به همان ایمیلی که وارد کردید فرستاده می‌شود.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="contact-form">
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="honeypot">
        <label htmlFor="support-company">شرکت</label>
        <input id="support-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-group">
        <Label htmlFor="support-category">موضوع پیام</Label>
        <select
          id="support-category"
          name="category"
          defaultValue="listing"
          className="support-select"
        >
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <Label htmlFor="support-name">نام</Label>
        <Input id="support-name" name="name" required maxLength={120} autoComplete="name" />
      </div>

      <div className="form-group">
        <Label htmlFor="support-email">ایمیل</Label>
        <Input
          id="support-email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <p className="form-hint">پاسخ به همین نشانی فرستاده می‌شود.</p>
      </div>

      <div className="form-group">
        <Label htmlFor="support-subject">نام کسب‌وکار یا عنوان (اختیاری)</Label>
        <Input
          id="support-subject"
          name="subject"
          maxLength={160}
          placeholder="اگر درباره‌ی یک کسب‌وکار خاص است، نامش را بنویسید"
        />
      </div>

      <div className="form-group">
        <Label htmlFor="support-message">توضیح</Label>
        <Textarea
          id="support-message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          placeholder="هرچه بیشتر توضیح دهید، سریع‌تر حل می‌شود: چه کاری کردید، چه انتظاری داشتید، چه دیدید."
        />
      </div>

      {error ? <div className="auth-alert is-error">{error}</div> : null}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : "ارسال به پشتیبانی"}
      </Button>
    </form>
  );
}

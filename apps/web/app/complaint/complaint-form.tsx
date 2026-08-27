// ============================================================================
// Source: app/complaint/complaint-form.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The complaint form. Shares the .contact-form furniture so it does not
//      read as a different product, and adds the two fields that make a
//      complaint actionable: what it is about, and what the person wants to
//      happen. Support asks "what went wrong"; a complaint has to ask "and
//      what would fix it", or every reply is a guess.
//
//      The success state names the mailbox the server actually used and
//      repeats the response window. It invents no case number — there is no
//      complaints table to number against, and a fabricated reference is the
//      first thing a complainant would quote back at us.
// ============================================================================
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitComplaint } from "./actions";
import { COMPLAINT_CATEGORIES, COMPLAINT_OUTCOMES } from "./categories";

const CATEGORIES = Object.entries(COMPLAINT_CATEGORIES);
const OUTCOMES = Object.entries(COMPLAINT_OUTCOMES);

export function ComplaintForm() {
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await submitComplaint(new FormData(e.currentTarget));

    if (result.success) setSentTo(result.sentTo ?? null);
    else setError(result.error ?? "خطایی رخ داد.");

    setBusy(false);
  }

  if (sentTo) {
    return (
      <div className="contact-sent">
        <CheckCircle2 size={30} />
        <strong>شکایت شما ثبت و ارسال شد</strong>
        <p>
          به{" "}
          <span dir="ltr" className="[font-family:var(--font-latin)]">
            {sentTo}
          </span>{" "}
          رسید و ظرف حداکثر ۳۰ روز پاسخ کتبی می‌گیرید. پاسخ به همان ایمیلی که
          وارد کردید فرستاده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="contact-form">
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="honeypot">
        <label htmlFor="complaint-company">شرکت</label>
        <input id="complaint-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-category">شکایت درباره‌ی چیست؟</Label>
        <select
          id="complaint-category"
          name="category"
          defaultValue="business"
          className="support-select"
        >
          {CATEGORIES.map(([value, cat]) => (
            <option key={value} value={value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-outcome">می‌خواهید چه اتفاقی بیفتد؟</Label>
        <select
          id="complaint-outcome"
          name="outcome"
          defaultValue="fix"
          className="support-select"
        >
          {OUTCOMES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-subject">مورد شکایت (اختیاری)</Label>
        <Input
          id="complaint-subject"
          name="subject"
          maxLength={200}
          placeholder="نام کسب‌وکار یا نشانی صفحه‌ای که شکایت درباره‌ی آن است"
        />
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-message">شرح کامل</Label>
        <Textarea
          id="complaint-message"
          name="message"
          required
          rows={8}
          minLength={30}
          maxLength={6000}
          placeholder="چه اتفاقی افتاد، کِی، و چه کسانی درگیر بودند؟ هرچه دقیق‌تر بنویسید، بررسی سریع‌تر و منصفانه‌تر است."
        />
        <p className="form-hint">دست‌کم ۳۰ حرف — شکایتی که شرح نداشته باشد قابل بررسی نیست.</p>
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-name">نام و نام خانوادگی</Label>
        <Input id="complaint-name" name="name" required maxLength={120} autoComplete="name" />
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-email">ایمیل</Label>
        <Input
          id="complaint-email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
        />
        <p className="form-hint">پاسخ کتبی به همین نشانی فرستاده می‌شود.</p>
      </div>

      <div className="form-group">
        <Label htmlFor="complaint-phone">تلفن تماس (اختیاری)</Label>
        <Input
          id="complaint-phone"
          name="phone"
          type="tel"
          dir="ltr"
          maxLength={40}
          autoComplete="tel"
          placeholder="+1 647 000 0000"
        />
      </div>

      {error ? <div className="auth-alert is-error">{error}</div> : null}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : "ثبت شکایت"}
      </Button>
    </form>
  );
}

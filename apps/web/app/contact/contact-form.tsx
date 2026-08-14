// ============================================================================
// Source: app/contact/contact-form.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The working contact form. Replaces a static mock-up.
// ============================================================================
"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendContactMessage } from "./actions";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await sendContactMessage(new FormData(e.currentTarget));

    if (result.success) setSent(true);
    else setError(result.error ?? "خطایی رخ داد.");

    setBusy(false);
  }

  if (sent) {
    return (
      <div className="contact-sent">
        <CheckCircle2 size={30} />
        <strong>پیام شما رسید</strong>
        <p>معمولاً ظرف یک تا دو روز کاری پاسخ می‌دهیم.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="contact-form">
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="honeypot">
        <label htmlFor="company">شرکت</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="form-group">
        <Label htmlFor="name">نام</Label>
        <Input id="name" name="name" required maxLength={120} autoComplete="name" />
      </div>

      <div className="form-group">
        <Label htmlFor="email">ایمیل</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div className="form-group">
        <Label htmlFor="subject">موضوع</Label>
        <Input id="subject" name="subject" maxLength={160} />
      </div>

      <div className="form-group">
        <Label htmlFor="message">پیام</Label>
        <Textarea id="message" name="message" required rows={6} maxLength={4000} />
      </div>

      {error ? <div className="auth-alert is-error">{error}</div> : null}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : "ارسال پیام"}
      </Button>
    </form>
  );
}

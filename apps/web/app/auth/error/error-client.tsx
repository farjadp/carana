// ============================================================================
// Source: app/auth/error/error-client.tsx
// Version: 1.0.0 — 2026-08-27
// Why: The resend form. The page itself stays a Server Component.
// ============================================================================
"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendConfirmation } from "../callback/actions";

export function ResendConfirmation() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await resendConfirmation(email);
          setNote(r.message);
        });
      }}
    >
      <label className="block text-sm font-bold" htmlFor="resend-email">
        ایمیلت را بنویس تا لینک تازه بفرستیم
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="resend-email"
          type="email"
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@domain.com"
          className="min-w-[220px] flex-1"
          required
        />
        <Button type="submit" disabled={pending || !email.trim()}>
          {pending ? "در حال ارسال…" : "ارسال دوباره"}
        </Button>
      </div>
      {note ? (
        <p className="text-sm leading-7 text-[color:var(--muted-text)]" role="status">
          {note}
        </p>
      ) : null}
    </form>
  );
}

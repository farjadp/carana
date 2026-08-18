// ============================================================================
// Source: app/jobs/[slug]/apply-button.tsx
// Version: 1.0.0 — 2026-08-18
// Why: Applications happen off-site — building an applicant tracker is a
//      different product. But the contact is revealed on click, and the click
//      writes a `job_apply` row against the business, which is the only
//      honest answer an owner ever gets to "did the ad work?".
// Env / Identity: Client. The contact is already in the payload; hiding it
//      behind a click is about measurement and scraping friction, not secrecy,
//      and the button never claims otherwise.
// ============================================================================
"use client";

import { useState } from "react";
import { Link2, Mail, Phone } from "lucide-react";

import { trackEvent } from "@/lib/analytics/track";

export function ApplyButton({
  businessId,
  method,
  value,
}: {
  businessId: string;
  method: "email" | "phone" | "url";
  value: string;
}) {
  const [revealed, setRevealed] = useState(false);

  const href = method === "email" ? `mailto:${value}` : method === "phone" ? `tel:${value}` : value;
  const Icon = method === "email" ? Mail : method === "phone" ? Phone : Link2;
  const label = method === "email" ? "ارسال رزومه با ایمیل" : method === "phone" ? "تماس برای این آگهی" : "رفتن به فرم درخواست";

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => {
          trackEvent(businessId, "job_apply");
          setRevealed(true);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--lajvard)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 sm:w-auto"
      >
        <Icon size={16} /> {label}
      </button>
    );
  }

  return (
    <a
      href={href}
      target={method === "url" ? "_blank" : undefined}
      rel={method === "url" ? "noreferrer nofollow" : undefined}
      dir="ltr"
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--lajvard)] bg-white px-5 py-3 text-sm font-bold text-[color:var(--lajvard)] transition hover:bg-[color:var(--lajvard)]/5 sm:w-auto"
    >
      <Icon size={16} /> {value}
    </a>
  );
}

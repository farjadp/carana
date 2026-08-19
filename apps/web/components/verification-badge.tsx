// ============================================================================
// Source: components/verification-badge.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The single visual expression of "this listing is verified". It appears
//      on the public profile, on listing cards and in the owner dashboard, and
//      it has to read the same in all three or it stops meaning anything.
// Env / Identity: Client-safe. Takes a computed status, does no IO.
//
// Note on artwork: this deliberately uses the existing icon set rather than a
// hand-drawn mark. The Achaemenid motifs in docs/07-design.md belong to a
// designer, and the last hand-coded SVG in this project was judged adequate
// rather than good. Colour, weight and spacing carry the brand here.
// ============================================================================
"use client";

import { BadgeCheck, Clock, ShieldAlert, ShieldX } from "lucide-react";

import {
  METHOD_EXPLANATION,
  METHOD_LABEL,
  type VerificationStatus,
} from "@/lib/verification/status";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** The whole product is RTL and Persian; Latin numerals look imported. */
export function faNumber(value: number): string {
  return String(Math.abs(value)).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

function faDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ----------------------------------------------------------------------------

interface BadgeProps {
  status: VerificationStatus;
  size?: "sm" | "lg";
  /** Owners always see the countdown; visitors only near expiry. */
  audience?: "public" | "owner";
  className?: string;
}

/**
 * The compact badge. Renders nothing when there is nothing to claim — an
 * absent badge is the honest signal for an unverified listing, and a grey
 * "not verified" chip on 677 imported rows would read as an accusation.
 */
export function VerificationBadge({
  status,
  size = "sm",
  audience = "public",
  className = "",
}: BadgeProps) {
  if (status.state === "unverified") return null;

  const showCountdown =
    status.daysRemaining !== null &&
    (audience === "owner" || status.showCountdownPublicly);

  const pad = size === "lg" ? "px-3.5 py-1.5 text-sm gap-2" : "px-2.5 py-1 text-xs gap-1.5";
  const icon = size === "lg" ? 18 : 14;

  if (status.state === "expired") {
    return (
      <span
        className={`inline-flex items-center rounded-lg font-bold shadow-sm bg-gray-200 text-gray-700 ${pad} ${className}`}
        title="این کسب‌وکار باید تاییدش را تمدید کند."
      >
        <ShieldX size={icon} />
        تایید منقضی شده
      </span>
    );
  }

  if (status.state === "superseded") {
    return (
      <span
        className={`inline-flex items-center rounded-lg font-bold shadow-sm bg-amber-100 text-amber-900 ${pad} ${className}`}
        title="اطلاعات تماس پس از تایید تغییر کرده و باید دوباره تایید شود."
      >
        <ShieldAlert size={icon} />
        نیازمند تایید دوباره
      </span>
    );
  }

  // verified / expiring — both are trustworthy, the second just has a clock.
  const tone =
    status.state === "expiring"
      ? "bg-[#c9a24b] text-[#14213d]"
      : "bg-[#7A1831] text-[#f6f1e8]";

  return (
    <span
      className={`inline-flex items-center rounded-lg font-bold shadow-sm ${tone} ${pad} ${className}`}
      title={status.method ? METHOD_EXPLANATION[status.method] : undefined}
    >
      <BadgeCheck size={icon} />
      {status.method ? METHOD_LABEL[status.method] : "تاییدشده"}
      {showCountdown && status.daysRemaining !== null && (
        <span className="opacity-80 font-medium">
          · {faNumber(status.daysRemaining)} روز تا تمدید
        </span>
      )}
    </span>
  );
}

// ----------------------------------------------------------------------------

/**
 * The expanded panel for the trust section of a profile. Says what was proven
 * and when — a badge nobody can interrogate is just decoration.
 */
export function VerificationDetail({
  status,
  audience = "public",
}: {
  status: VerificationStatus;
  audience?: "public" | "owner";
}) {
  if (status.state === "unverified") {
    return (
      <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
        <p className="font-bold mb-1">هنوز تایید نشده</p>
        <p className="text-gray-500 leading-relaxed">
          این آگهی را گوپلازا ثبت کرده است و صاحب آن هنوز مالکیتش را احراز نکرده.
          اطلاعات تماس ممکن است به‌روز نباشد.
        </p>
      </div>
    );
  }

  const trusted = status.state === "verified" || status.state === "expiring";

  return (
    <div
      className={`rounded-xl p-3 text-xs ${
        trusted ? "bg-[#7A1831]/5 text-[#14213d]" : "bg-gray-100 text-gray-700"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold flex items-center gap-1.5">
          <BadgeCheck size={15} className={trusted ? "text-[#7A1831]" : "text-gray-500"} />
          {status.method ? METHOD_LABEL[status.method] : "تاییدشده"}
        </span>
        {status.verifiedAt && (
          <span className="text-[#5f6472]">{faDate(status.verifiedAt)}</span>
        )}
      </div>

      {status.method && (
        <p className="leading-relaxed text-[#5f6472] mb-2">
          {METHOD_EXPLANATION[status.method]}
        </p>
      )}

      {status.daysRemaining !== null &&
        (audience === "owner" || status.showCountdownPublicly) && (
          <p className="flex items-center gap-1.5 font-medium">
            <Clock size={13} />
            {status.daysRemaining > 0
              ? `${faNumber(status.daysRemaining)} روز تا تمدید اجباری`
              : `${faNumber(status.daysRemaining)} روز از مهلت تمدید گذشته است`}
          </p>
        )}

      <p className="mt-2 text-[10px] text-[#5f6472] leading-relaxed">
        گوپلازا هر شش ماه یک‌بار شماره تماس و ایمیل هر کسب‌وکار را دوباره تایید می‌کند
        تا مطمئن شود اطلاعات همچنان درست است.
      </p>
    </div>
  );
}

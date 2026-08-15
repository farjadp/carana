// ============================================================================
// Source: components/business/business-card.tsx
// Version: 1.0.0 — 2026-08-27
// Why: One card, used by every listing surface. They were being written inline
//      per section, which is how three sections end up with three different
//      information densities and three different call-to-action labels.
// Env / Identity: Client-safe. Takes a row, does no IO.
// ============================================================================
"use client";

import Link from "next/link";
import { Building2, Eye, MapPin } from "lucide-react";

import { VerificationBadge, faNumber } from "@/components/verification-badge";
import { getVerificationStatus, type VerifiableBusiness } from "@/lib/verification/status";

export interface BusinessCardData extends VerifiableBusiness {
  id: string;
  slug?: string | null;
  name: string;
  category?: string | null;
  city?: string | null;
  province?: string | null;
  short_description?: string | null;
  description?: string | null;
  logo_url?: string | null;
  view_count?: number | null;
  [key: string]: unknown;
}

export function BusinessCard({
  business,
  showViews = false,
  categoryLabel,
}: {
  business: BusinessCardData;
  showViews?: boolean;
  /** Human label for business.category; falls back to the raw slug. */
  categoryLabel?: string | null;
}) {
  const status = getVerificationStatus(business);
  const href = `/businesses/${business.slug || business.id}`;

  return (
    // The whole card is the link. A card where only a small button navigates
    // wastes the largest tap target on the screen, which matters most on mobile.
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white transition hover:-translate-y-0.5 hover:border-[#800000]/30 hover:shadow-lg"
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f6f1e8]">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Building2 size={22} className="text-[#800000]/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-[#14213d] group-hover:text-[#800000]">
              {business.name}
            </h3>
            {business.category && (
              <p className="truncate text-xs text-[#5f6472]">{categoryLabel ?? business.category}</p>
            )}
          </div>
        </div>

        {/* Badge only appears when a listing is genuinely verified. Most are
            not, and an absent badge is the honest signal. */}
        <VerificationBadge status={status} audience="public" className="mb-3 self-start" />

        <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-[#5f6472]">
          {business.short_description ||
            business.description ||
            "اطلاعات بیشتر در صفحه‌ی این کسب‌وکار"}
        </p>

        <div className="flex items-center justify-between text-xs text-[#5f6472]">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-[#800000]" />
            <span className="truncate">
              {business.city || "شهر ثبت نشده"}
              {business.province ? `، ${business.province}` : ""}
            </span>
          </span>

          {showViews && typeof business.view_count === "number" && business.view_count > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              <Eye size={13} />
              {faNumber(business.view_count)}
            </span>
          )}
        </div>
      </div>

      {/* Says what happens next, in the words a visitor would use. "View
          profile" is our jargon: nobody looking for a dentist thinks of it as
          a profile. */}
      <div className="border-t border-[rgba(20,33,61,0.08)] bg-[#f6f1e8]/60 px-5 py-3 text-center text-sm font-bold text-[#800000] transition group-hover:bg-[#800000] group-hover:text-[#f6f1e8]">
        دیدن اطلاعات و تماس
      </div>
    </Link>
  );
}

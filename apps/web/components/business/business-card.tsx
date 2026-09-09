// ============================================================================
// Source: components/business/business-card.tsx
// Version: 1.1.0 — 2026-09-09
// Why: One card, used by every listing surface. They were being written inline
//      per section, which is how three sections end up with three different
//      information densities and three different call-to-action labels.
//
//      v1.1: the category line no longer falls back to the raw slug. It did,
//      and on 9 Sep the live home page printed «digital-it» on six cards
//      (a truncated label map — fixed in app/page.tsx v3) and «retail» on a
//      seventh, which is a `businesses.category` value with no row in
//      `categories` at all. A lowercase English slug is not a category name to
//      a Persian reader; it is our internal identifier leaking onto the card.
//      Where no human label exists the line is simply absent — the same rule
//      the verification badge follows.
// Env / Identity: Client-safe. Takes a row, does no IO.
// ============================================================================
"use client";

import Link from "next/link";
import { Building2, Eye, Flame, MapPin, Moon, Sparkles } from "lucide-react";

import { VerificationBadge, faNumber } from "@/components/verification-badge";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { activeBusyStatus } from "@/lib/business/live-status";
import { getVerificationStatus, type VerifiableBusiness } from "@/lib/verification/status";
import { realImageUrl } from "@goplaza/core";

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
  plan?: string | null;
  plan_until?: string | null;
  busy_status?: string | null;
  busy_status_until?: string | null;
  [key: string]: unknown;
}

/**
 * The raw `businesses.category` value, but only when it is something a reader
 * can read. A value that is nothing but lowercase ASCII, digits and dashes is
 * one of our slugs («digital-it», «retail»); anything else — a Persian name
 * typed by an owner, say — is shown as written.
 */
function humanCategory(raw?: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  return /^[a-z0-9][a-z0-9._-]*$/.test(v) ? null : v;
}

export function BusinessCard({
  business,
  showViews = false,
  categoryLabel,
  className = "",
}: {
  business: BusinessCardData;
  showViews?: boolean;
  /** Human label for business.category. Without one, no category line. */
  categoryLabel?: string | null;
  /** For a rail, where every card in the row has to be the same height. */
  className?: string;
}) {
  const status = getVerificationStatus(business);
  // Recomputed here, not read off `business.plan` directly — a late downgrade
  // webhook must never leave a lapsed listing wearing the chip. This is the
  // only place the card decides "featured"; every caller gets it for free.
  const featured = entitlementsFor(business).has("featured_placement");
  // Self-expiring — a status set once during a Friday rush must not still
  // read "busy" a week later. activeBusyStatus() checks busy_status_until,
  // not just whether the column is set.
  const busy = activeBusyStatus(business);
  const href = `/businesses/${business.slug || business.id}`;

  // Not `business.logo_url` directly: the importers wrote a placeholder path
  // that has never existed onto two thirds of the listings, so a truthiness
  // test picks the <img> branch and renders a broken image. See
  // @goplaza/core/images.
  const logo = realImageUrl([business.logo_url]);

  return (
    // The whole card is the link. A card where only a small button navigates
    // wastes the largest tap target on the screen, which matters most on mobile.
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white transition hover:-translate-y-0.5 hover:border-[#7A1831]/30 hover:shadow-lg ${className}`}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f6f1e8]">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Building2 size={22} className="text-[#7A1831]/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-[#14213d] group-hover:text-[#7A1831]">
              {business.name}
            </h3>
            {categoryLabel || humanCategory(business.category) ? (
              <p className="truncate text-xs text-[#5f6472]">
                {categoryLabel || humanCategory(business.category)}
              </p>
            ) : null}
          </div>
        </div>

        {/* Badge only appears when a listing is genuinely verified. Most are
            not, and an absent badge is the honest signal. Same rule for
            "ویژه": it only renders when the paid placement is actually
            active, right on the card it paid to move — an unlabelled paid
            position is an advertisement pretending to be a search result. */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <VerificationBadge status={status} audience="public" />
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-black text-white">
              <Sparkles size={11} /> ویژه
            </span>
          )}
          {busy === "busy" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
              <Flame size={11} /> الان شلوغه
            </span>
          )}
          {busy === "quiet" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white">
              <Moon size={11} /> الان خلوته
            </span>
          )}
        </div>

        <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-[#5f6472]">
          {business.short_description ||
            business.description ||
            "اطلاعات بیشتر در صفحه‌ی این کسب‌وکار"}
        </p>

        <div className="flex items-center justify-between text-xs text-[#5f6472]">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-[#7A1831]" />
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
      <div className="border-t border-[rgba(20,33,61,0.08)] bg-[#f6f1e8]/60 px-5 py-3 text-center text-sm font-bold text-[#7A1831] transition group-hover:bg-[#7A1831] group-hover:text-[#f6f1e8]">
        دیدن اطلاعات و تماس
      </div>
    </Link>
  );
}

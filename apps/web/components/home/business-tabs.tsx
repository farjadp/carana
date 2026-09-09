// ============================================================================
// Source: components/home/business-tabs.tsx
// Version: 1.0.0 — 2026-09-09
// Why: «جدیدترین کسب‌وکارها» and «پربازدیدترین کسب‌وکارها» were two sections,
//      stacked, each a heading + a rail of six business cards + a "see all"
//      link. Deduplicating their CONTENTS (24 Aug) stopped them showing the
//      same three businesses, but it did not stop them being the same object
//      twice: a visitor scrolled past four consecutive bands of business cards
//      under four different headings and read them as one repeated thing.
//
//      One section, two tabs. Same rails, same cards, same links — half the
//      page height, and the pairing now says what it means: these are two
//      orderings of one list, which is exactly what they are.
//
//      View counts are deliberately NOT shown. The most-visited listing on the
//      day of this change had 46 views and the sixth had 11; printing those
//      numbers tells a visitor the site is empty and tells an owner that
//      registering is pointless. The ordering is real and the heading claims
//      nothing more than the ordering — «بیشترین بازدید در پلازا» is true
//      whatever the counts are. The numbers still exist where they are useful:
//      the owner's own dashboard.
// Env / Identity: Client component. Takes rows, does no IO.
// ============================================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BusinessCard, type BusinessCardData } from "@/components/business/business-card";
import { Rail } from "@/components/ui/rail";

export type BusinessTab = {
  key: string;
  label: string;
  /** Shown under the heading while this tab is the open one. */
  subtitle: string;
  /** Where "see all" goes for this ordering. */
  href: string;
  items: BusinessCardData[];
};

export function BusinessTabs({
  tabs,
  categoryLabels,
}: {
  tabs: BusinessTab[];
  /** category slug → display name. A slug shown raw is a bug, not a label. */
  categoryLabels: Record<string, string>;
}) {
  const [openKey, setOpenKey] = useState(tabs[0]?.key ?? "");
  const open = tabs.find((t) => t.key === openKey) ?? tabs[0];
  if (!open) return null;

  return (
    <section className="border-t border-gray-100 bg-white px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">کسب‌وکارهای پلازا</h2>
            <p className="mt-1.5 text-sm text-gray-500">{open.subtitle}</p>
          </div>
          <Link
            href={open.href}
            className="hidden shrink-0 items-center gap-1.5 text-sm font-bold text-[color:var(--lajvard)] hover:underline sm:inline-flex"
          >
            مشاهده همه <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Only rendered as tabs when there is something to switch between —
            a single tab is a heading wearing a control's clothes. */}
        {tabs.length > 1 ? (
          <div role="tablist" aria-label="ترتیب فهرست" className="mb-6 flex flex-wrap gap-2">
            {tabs.map((t) => {
              const isOpen = t.key === open.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isOpen}
                  onClick={() => setOpenKey(t.key)}
                  className={`h-10 rounded-full border px-5 text-sm font-bold transition ${
                    isOpen
                      ? "border-transparent bg-[color:var(--text)] text-[#f6f1e8]"
                      : "border-[color:var(--line)] bg-white text-[color:var(--text)] hover:border-[color:var(--annabi)]/40"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div role="tabpanel">
          <Rail prevLabel="کسب‌وکارهای قبلی" nextLabel="کسب‌وکارهای بیشتر">
            {open.items.map((biz) => (
              <div key={biz.id} className="w-[78vw] shrink-0 snap-start sm:w-[340px] lg:w-[300px]">
                <BusinessCard
                  business={biz}
                  categoryLabel={biz.category ? categoryLabels[biz.category] : null}
                  className="h-full"
                />
              </div>
            ))}
          </Rail>
        </div>

        {/* The arrows are desktop-only and the rail is not obviously
            scrollable on a phone, so the way in is a link, not a hint. */}
        <Link
          href={open.href}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--annabi)]/40 sm:hidden"
        >
          همه‌ی کسب‌وکارها <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

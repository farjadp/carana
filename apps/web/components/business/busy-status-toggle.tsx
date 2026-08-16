// ============================================================================
// Source: components/business/busy-status-toggle.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Owner-facing control for the "busy now / quiet now" status
//      (lib/business/live-status.ts). Entitled owners get the toggle; a
//      lower-plan owner gets an upsell line, never a hidden or disabled
//      button with no explanation.
// Env / Identity: Client Component.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Moon, X } from "lucide-react";
import { toast } from "sonner";

import { setBusyStatus } from "@/lib/actions/business-status";
import { activeBusyStatus, BUSY_STATUS_HOURS, type BusyStatusRow } from "@/lib/business/live-status";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

type Business = BusyStatusRow & { id: string; plan?: string | null; plan_until?: string | null };

export function BusyStatusToggle({ business }: { business: Business }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = activeBusyStatus(business);

  if (!entitlementsFor(business).has("busy_status")) {
    return (
      <p className="mt-3 text-xs text-[color:var(--muted-text)]">
        وضعیت زنده «الان شلوغیم / خلوته» از پلن {PLANS.pro.name} به بالا فعال می‌شود.
      </p>
    );
  }

  const set = (status: "busy" | "quiet" | null) => {
    startTransition(async () => {
      const result = await setBusyStatus(business.id, status);
      if (result.success) {
        toast.success(status ? `وضعیت «${status === "busy" ? "شلوغ" : "خلوت"}» تا ${BUSY_STATUS_HOURS} ساعت روی پروفایل نمایش داده می‌شود` : "وضعیت پاک شد");
        router.refresh();
      } else {
        toast.error(result.error || "خطا در ثبت وضعیت");
      }
    });
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => set(current === "busy" ? null : "busy")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${current === "busy" ? "bg-red-600 text-white" : "border border-[color:var(--line)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"}`}
      >
        <Flame size={13} /> الان شلوغیم
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => set(current === "quiet" ? null : "quiet")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${current === "quiet" ? "bg-emerald-600 text-white" : "border border-[color:var(--line)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"}`}
      >
        <Moon size={13} /> الان خلوته
      </button>
      {current ? (
        <button type="button" disabled={pending} onClick={() => set(null)} className="text-[color:var(--muted-text)] hover:text-red-600">
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

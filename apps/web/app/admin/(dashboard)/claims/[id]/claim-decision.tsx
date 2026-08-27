// ============================================================================
// Source: app/admin/(dashboard)/claims/[id]/claim-decision.tsx
// Version: 1.0.0 — 2026-08-27
// Why: The approve/reject controls for one claim. Separate from the page so
//      the result of the decision (including a refusal, e.g. the listing was
//      claimed by someone else meanwhile) is shown instead of swallowed.
// Env / Identity: Client, admin section.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { approveClaim, rejectClaim } from "../actions";

export function ClaimDecision({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "خطایی رخ داد.");
        return;
      }
      router.refresh();
    });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--line)] bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="دلیل رد کردن — برای رد کردن اجباری است"
            className="h-10 min-w-[200px] flex-1 rounded-lg border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
          />
          <button
            type="button"
            disabled={pending || reason.trim().length < 3}
            onClick={() => run(() => rejectClaim(claimId, reason))}
            className="h-10 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            رد درخواست
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveClaim(claimId))}
            className="flex h-10 items-center gap-2 rounded-lg bg-green-600 px-5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-40"
          >
            <CheckCircle2 size={16} />
            تایید مالکیت
          </button>
        </div>
      </div>
    </div>
  );
}

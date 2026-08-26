// ============================================================================
// Source: app/dashboard/channels/reconfirm-button.tsx
// Version: 1.0.0 — 2026-08-26
// Why: "It is still there" — the only thing that keeps a declared entry in the
//      index past 90 days. Shown before the date as well as after it, so the
//      first time anyone meets this rule is not the day their entry vanished.
// Env / Identity: Client. The action re-checks who owns the row.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { relativeDayFa } from "@goplaza/core";

import { reconfirmChannel } from "@/lib/actions/channels";

export function ReconfirmButton({
  channelId,
  lapsed,
  confirmBy,
}: {
  channelId: string;
  lapsed: boolean;
  confirmBy: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [done, setDone] = useState(false);

  const daysLeft = confirmBy
    ? Math.ceil((new Date(confirmBy).getTime() - Date.now()) / 86_400_000)
    : null;

  if (done) return <p className="text-xs font-bold text-[color:var(--success,#0f7b4f)]">تأیید شد.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const res = await reconfirmChannel(channelId);
            if (res.success) {
              setDone(true);
              router.refresh();
            } else {
              toast.error(res.error ?? "تأیید ناموفق بود");
            }
          })
        }
        className="rounded-xl border border-[color:var(--line)] px-4 py-2 text-xs font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)] disabled:opacity-40"
      >
        هنوز فعال است
      </button>
      <span className="text-xs text-[color:var(--muted-text)]">
        {lapsed
          ? `از فهرست برداشته شده چون از ${relativeDayFa(confirmBy)} تأیید نشده.`
          : daysLeft !== null
            ? `${daysLeft.toLocaleString("fa-IR")} روز تا تأیید بعدی`
            : ""}
      </span>
    </div>
  );
}

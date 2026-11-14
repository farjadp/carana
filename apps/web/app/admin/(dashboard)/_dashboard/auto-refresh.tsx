// ============================================================================
// Source: app/admin/(dashboard)/_dashboard/auto-refresh.tsx
// Version: 1.0.0 — 2026-11-13
// Why: "Live" here means the server page is re-rendered every minute and the
//      time printed is when the server read the numbers — not a ticker that
//      animates by itself. router.refresh() re-runs the server component and
//      keeps client state. Paused while the tab is hidden, so a forgotten tab
//      does not run ~30 production queries a minute all night.
// Env / Identity: Client component.
// ============================================================================
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const INTERVAL_MS = 60_000;

const timeFa = (iso: string) =>
  new Date(iso).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Toronto",
  });

export function AutoRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const id = window.setInterval(refresh, INTERVAL_MS);
    const onVis = () => {
      setPaused(document.visibilityState !== "visible");
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-xs text-(--muted-text)">
      <span>
        به‌روزرسانی: <b className="text-(--text)">{timeFa(generatedAt)}</b> (وقت تورنتو)
        {" · "}
        {paused ? "متوقف تا برگشت به این زبانه" : "هر ۶۰ ثانیه"}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-(--line) bg-white px-2 py-1 font-semibold text-(--text) hover:border-(--lajvard) disabled:opacity-60"
      >
        <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
        {pending ? "در حال خواندن…" : "تازه‌سازی"}
      </button>
    </div>
  );
}

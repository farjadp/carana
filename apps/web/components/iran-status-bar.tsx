// ============================================================================
// Source: components/iran-status-bar.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Tehran clock (Jalali + Shahanshahi date) and real free-market USD/EUR/
//      CAD rates, in the footer only — Farjad's call on placement, "just
//      don't get in the way." One muted line, same size and colour as the
//      copyright text next to it, no icons, no motion beyond the minute
//      itself ticking over.
// Env / Identity: Client Component, but seeded from server-computed initial
//      text (see site-footer.tsx). Recomputing nowInTehran() during the
//      client's own hydration pass — instead of reusing what the server
//      already rendered — risks a one-minute-off hydration mismatch if the
//      request happens to straddle a minute boundary. Seeding from a prop
//      and only recomputing after mount avoids that entirely.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { formatTehranDate, formatTehranTime, nowInTehran } from "@charana/core";

const faDigits = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 0 });

export function IranStatusBar({
  initialTime,
  initialDate,
  rates,
}: {
  initialTime: string;
  initialDate: string;
  rates: { usd: number | null; eur: number | null; cad: number | null } | null;
}) {
  const [time, setTime] = useState(initialTime);
  const [date, setDate] = useState(initialDate);

  useEffect(() => {
    const tick = () => {
      const t = nowInTehran();
      setTime(formatTehranTime(t));
      setDate(formatTehranDate(t));
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const rateParts: string[] = [];
  if (rates?.usd) rateParts.push(`دلار ${faDigits(rates.usd)}`);
  if (rates?.eur) rateParts.push(`یورو ${faDigits(rates.eur)}`);
  if (rates?.cad) rateParts.push(`دلار کانادا ${faDigits(rates.cad)}`);

  return (
    <p className="max-w-2xl text-center text-[11px] leading-relaxed text-gray-400" dir="rtl">
      تهران {time} · {date}
      {rateParts.length > 0 ? <> · {rateParts.join(" · ")} تومان</> : null}
    </p>
  );
}

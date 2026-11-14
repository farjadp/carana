// ============================================================================
// Source: app/admin/(dashboard)/_dashboard/trend-chart.tsx
// Version: 1.0.0 — 2026-11-13
// Why: 30 daily columns for one series (sign-ups, new listings, typed
//      searches). Single series, so no legend — the title names it. Hover or
//      focus shows the exact day and count; a table view sits under it so the
//      numbers are never colour- or pointer-only.
//      Days run right-to-left like the rest of the RTL page: today is the
//      leftmost column, matching how Persian date ranges read.
// Env / Identity: Client component (hover state only). Data comes from the
//      server page; nothing here fetches.
// ============================================================================
"use client";

import { useState } from "react";
import { faNumber as fa } from "@goplaza/core";

export type TrendPoint = { day: string; n: number };

const W = 300;
const H = 72;
const GAP = 2;

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("fa-IR", { month: "long", day: "numeric", timeZone: "UTC" });

export function TrendChart({ title, points, unit }: { title: string; points: TrendPoint[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.n));
  const total = points.reduce((s, p) => s + p.n, 0);
  const slot = W / points.length;
  const barW = Math.max(1, slot - GAP);
  const active = hover === null ? null : points[hover];

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-(--text)">{title}</span>
        <span className="text-xs text-(--muted-text)">
          {active ? (
            <>
              {dayLabel(active.day)}: <b className="text-(--text)">{fa(active.n)}</b> {unit}
            </>
          ) : (
            <>
              ۳۰ روز: <b className="text-(--text)">{fa(total)}</b> {unit}
            </>
          )}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H + 1}`}
        className="h-[76px] w-full overflow-visible"
        role="img"
        aria-label={`${title} — ${fa(total)} ${unit} در ۳۰ روز`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="var(--line)" strokeWidth={1} />
        {points.map((p, i) => {
          // RTL: oldest on the right, today on the left.
          const x = W - (i + 1) * slot + GAP / 2;
          const h = p.n === 0 ? 0 : Math.max(3, (p.n / max) * (H - 4));
          const isHover = hover === i;
          return (
            <g key={p.day}>
              {h > 0 && (
                <path
                  d={roundedTop(x, H - h, barW, h, Math.min(2, barW / 2))}
                  fill={isHover ? "var(--annabi)" : "var(--lajvard)"}
                  opacity={hover === null || isHover ? 1 : 0.45}
                />
              )}
              {/* Hit target: the whole column, taller than the mark. */}
              <rect
                x={W - (i + 1) * slot}
                y={0}
                width={slot}
                height={H + 1}
                fill="transparent"
                tabIndex={0}
                aria-label={`${dayLabel(p.day)}: ${fa(p.n)} ${unit}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="cursor-crosshair outline-none"
              />
            </g>
          );
        })}
      </svg>

      <details className="text-xs text-(--muted-text)">
        <summary className="cursor-pointer select-none">جدول روزانه</summary>
        <table className="mt-2 w-full border-collapse">
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.day} className="border-b border-(--line)">
                <td className="py-1">{dayLabel(p.day)}</td>
                <td className="py-1 text-left font-bold text-(--text)">{fa(p.n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** A column with rounded data-end (top) and a square baseline. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return [
    `M${x},${y + h}`,
    `V${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `H${x + w - rr}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}

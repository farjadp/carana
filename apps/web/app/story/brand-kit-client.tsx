// ============================================================================
// Source: app/story/brand-kit-client.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The interactive bits of the brand page — copy-a-hex swatches and the
//      mark preview on each brand surface. Everything else on /story is static.
// ============================================================================
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

export type Swatch = { name: string; fa: string; hex: string; role: string; onDark?: boolean };

export function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {swatches.map((s) => (
        <button
          key={s.hex}
          type="button"
          onClick={() => copy(s.hex)}
          className="group overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white text-right transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)]"
          aria-label={`کپی ${s.hex}`}
        >
          <div className="flex h-24 items-end justify-between p-3" style={{ background: s.hex }}>
            <span className={`text-[11px] font-black ${s.onDark ? "text-[#f6f1e8]" : "text-[#14213d]"}`} dir="ltr">
              {copied === s.hex ? <span className="inline-flex items-center gap-1"><Check size={12} /> copied</span> : s.hex}
            </span>
            <span className={`opacity-0 transition group-hover:opacity-100 ${s.onDark ? "text-[#f6f1e8]" : "text-[#14213d]"}`}><Copy size={14} /></span>
          </div>
          <div className="p-3">
            <div className="flex items-baseline justify-between gap-2">
              <strong className="text-sm text-[color:var(--text)]">{s.fa}</strong>
              <span className="text-[11px] font-semibold text-[color:var(--muted-text)]" dir="ltr">{s.name}</span>
            </div>
            <p className="mt-1 text-[11.5px] leading-5 text-[color:var(--muted-text)]">{s.role}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/** The mark on each surface it is allowed on. */
export function MarkSurfaces() {
  const surfaces = [
    { label: "روی کرم — اصلی", bg: "#f6f1e8", color: "#7A1831" },
    { label: "روی زرشکی — معکوس", bg: "#7A1831", color: "#f6f1e8" },
    { label: "روی سرمه‌ای", bg: "#14213d", color: "#f6f1e8" },
    { label: "تک‌رنگ سیاه", bg: "#ffffff", color: "#14213d" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {surfaces.map((s) => (
        <div key={s.label} className="overflow-hidden rounded-2xl border border-[color:var(--line)]">
          <div className="flex h-36 items-center justify-center" style={{ background: s.bg }}>
            <BrandMark size={72} color={s.color} />
          </div>
          <div className="bg-white p-2.5 text-center text-xs font-bold text-[color:var(--text)]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Size ladder — one geometry from 96px down to the 16px favicon. */
export function MarkSizes() {
  return (
    <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-[color:var(--line)] bg-white p-5" dir="ltr">
      {[96, 64, 48, 32, 24, 16].map((n) => (
        <div key={n} className="text-center">
          <BrandMark size={n} color="#7A1831" />
          <div className="mt-2 text-[11px] font-semibold text-[color:var(--muted-text)]">{n}px</div>
        </div>
      ))}
    </div>
  );
}

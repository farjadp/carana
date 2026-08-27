// ============================================================================
// Source: app/releases/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: What changed, per version — from lib/data/releases.ts.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Globe, Smartphone } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { RELEASES } from "@/lib/data/releases";
import { faDigits as fa } from "@goplaza/core";

export const metadata: Metadata = {
  alternates: { canonical: "/releases" }, title: "نسخه‌ها", description: "تغییرات هر نسخه‌ی پلازا." };
const P: Record<string, { label: string; icon: React.ReactNode }> = {
  web: { label: "وب", icon: <Globe size={12} /> },
  ios: { label: "iOS", icon: <Smartphone size={12} /> },
  android: { label: "Android", icon: <Smartphone size={12} /> },
};

export default function ReleasesPage() {
  return (
    <InnerPage currentPath="/releases" currentSection="brand" eyebrow="نسخه‌ها" title="چه چیزی عوض شد." description="هر نسخه، به زبان آدمیزاد. وب خودکار به‌روز است؛ اپ را از صفحه‌ی دانلود بگیرید.">
      <ol className="relative border-r-2 border-[color:var(--line)] pr-6 space-y-8" dir="rtl">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="relative">
            <span className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-[color:var(--bg)] ${i === 0 ? "bg-[color:var(--annabi)]" : "bg-[color:var(--muted-text)]"}`} />
            <div className="rounded-2xl bg-white border border-[color:var(--line)] p-5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-lg font-black text-[color:var(--text)]" dir="ltr">v{r.version}</span>
                {i === 0 ? <span className="text-[11px] font-bold bg-[color:var(--annabi)] text-[#f6f1e8] px-2 py-0.5 rounded-full">جدیدترین</span> : null}
                <span className="text-xs text-[color:var(--muted-text)]">{fa(r.date)}</span>
                <span className="mr-auto flex gap-1">
                  {r.platforms.map((p) => <span key={p} className="inline-flex items-center gap-1 text-[10.5px] bg-[color:var(--bg)] text-[color:var(--muted-text)] px-2 py-0.5 rounded-full">{P[p].icon}{P[p].label}</span>)}
                </span>
              </div>
              <div className="font-bold text-[color:var(--text)]">{r.title}</div>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--text)]/80 list-disc pr-5">
                {r.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3" dir="rtl">
        <Link href="/download" className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--annabi)] text-[#f6f1e8] font-bold px-4 py-2.5"><Download size={16} /> دانلود آخرین نسخه</Link>
        <Link href="/roadmap" className="inline-flex items-center gap-1 rounded-xl bg-white border border-[color:var(--line)] text-[color:var(--text)] font-bold px-4 py-2.5">رودمپ <ArrowLeft size={14} /></Link>
      </div>
    </InnerPage>
  );
}

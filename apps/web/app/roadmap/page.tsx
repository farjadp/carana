// ============================================================================
// Source: app/roadmap/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: What we are building next, honestly labelled — from lib/data/releases.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Mail } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { ROADMAP } from "@/lib/data/releases";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  alternates: { canonical: "/roadmap" }, title: "رودمپ", description: "گوپلازا به کجا می‌رود." };

export default function RoadmapPage() {
  return (
    <InnerPage currentPath="/roadmap" currentSection="brand" eyebrow="رودمپ" title="به کجا می‌رویم." description="سه ستون: همین حالا، بعدی، انجام‌شده. تاریخ قول نمی‌دهیم؛ ترتیب را قول می‌دهیم.">
      <div className="grid md:grid-cols-3 gap-4" dir="rtl">
        {ROADMAP.map((col) => (
          <section key={col.when} className="rounded-3xl bg-white border border-[color:var(--line)] p-5">
            <h2 className="font-black text-[color:var(--text)] mb-3 flex items-center gap-2">
              <svg viewBox="0 0 18 18" width="11" height="11" aria-hidden><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg>{col.when}
            </h2>
            <ul className="space-y-3">
              {col.items.map((it) => (
                <li key={it.title} className="flex gap-2.5">
                  {it.done ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={18} className="text-[color:var(--line)] shrink-0 mt-0.5" />}
                  <div>
                    <div className={`font-bold ${it.done ? "text-[color:var(--muted-text)] line-through decoration-1" : "text-[color:var(--text)]"}`}>{it.title}</div>
                    <p className="text-sm text-[color:var(--muted-text)] leading-relaxed">{it.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-[color:var(--muted-text)]" dir="rtl">
        چیزی کم است؟ پیشنهادت را به <a href={`mailto:${company.email.general}`} className="text-[color:var(--lajvard)] font-bold inline-flex items-center gap-1" dir="ltr"><Mail size={13} />{company.email.general}</a> بفرست. رودمپ را از روی چیزی که کاربران می‌خواهند مرتب می‌کنیم — نه چیزی که ما دوست داریم بسازیم.
        {" "}<Link href="/releases" className="text-[color:var(--lajvard)] font-bold">تغییرات نسخه‌ها →</Link>
      </p>
    </InnerPage>
  );
}

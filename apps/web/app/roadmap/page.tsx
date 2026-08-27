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
  alternates: { canonical: "/roadmap" }, title: "رودمپ", description: "پلازا به کجا می‌رود." };

export default function RoadmapPage() {
  return (
    <InnerPage
      currentPath="/roadmap"
      currentSection="brand"
      hero="wash"
      eyebrow="رودمپ"
      title="به کجا می‌رویم."
      description="سه ستون: همین حالا، بعدی، انجام‌شده. تاریخ قول نمی‌دهیم؛ ترتیب را قول می‌دهیم."
    >
      <div className="grid gap-4 md:grid-cols-3" dir="rtl">
        {ROADMAP.map((col, i) => (
          <section key={col.when} className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
            {/* The stage is the heading. The gold glyph that used to sit
                beside it decorated three columns identically and told the
                reader nothing about which stage they were in. */}
            <span className={`block h-1 w-10 rounded-full ${i === 0 ? "bg-[color:var(--annabi)]" : i === 1 ? "bg-[color:var(--lajvard)]" : "bg-emerald-600"}`} aria-hidden />
            <h2 className="mb-4 mt-4 text-lg font-black text-[color:var(--text)]">{col.when}</h2>
            <ul className="space-y-4">
              {col.items.map((it) => (
                <li key={it.title} className="flex gap-2.5">
                  {it.done ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /> : <Circle size={18} className="text-[color:var(--line)] shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className={`font-bold leading-6 ${it.done ? "text-[color:var(--muted-text)] line-through decoration-1" : "text-[color:var(--text)]"}`}>{it.title}</div>
                    <p className="mt-1 text-[13px] leading-7 text-[color:var(--muted-text)]">{it.body}</p>
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

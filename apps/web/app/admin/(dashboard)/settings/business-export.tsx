// ============================================================================
// Source: app/admin/(dashboard)/settings/business-export.tsx
// Version: 1.0.0 — 2026-08-23
// Why: Just the businesses list, every column, downloadable in the format
//      the admin actually wants to open it in — not the full multi-table
//      JSONL snapshot above (backup-manager.tsx), which is a restore
//      mechanism, not a "give me the directory" export.
// Env / Identity: Plain links to /api/admin/export/businesses?format=…;
//      admin-only server route re-checks role, this component adds no
//      client-side auth of its own.
// ============================================================================
"use client";

import { FileSpreadsheet, FileJson, FileText } from "lucide-react";

const FORMATS = [
  { format: "csv", label: "CSV", hint: "برای Excel و Google Sheets", icon: FileText },
  { format: "xlsx", label: "Excel (xlsx)", hint: "با فرمت واقعی صفحه‌گسترده", icon: FileSpreadsheet },
  { format: "json", label: "JSON", hint: "برای استفاده‌ی برنامه‌نویسی", icon: FileJson },
] as const;

export function BusinessExport() {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-[color:var(--muted-text)]">
        خروجی کامل جدول <b dir="ltr">businesses</b> — همان چیزی که در دیتابیس هست، تمام ستون‌ها،
        بدون فیلتر. برای اشتراک‌گذاری با بیرون از تیم یا باز کردن در اکسل، نه برای بازیابی
        (برای آن، بخش «پشتیبان‌گیری و بازیابی» بالا را استفاده کن).
      </p>
      <div className="flex flex-wrap gap-3">
        {FORMATS.map(({ format, label, hint, icon: Icon }) => (
          <a
            key={format}
            href={`/api/admin/export/businesses?format=${format}`}
            className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-3 text-sm transition hover:border-[color:var(--lajvard)] hover:bg-white"
          >
            <Icon size={18} className="text-[color:var(--lajvard)]" />
            <span className="flex flex-col">
              <span className="font-bold text-[color:var(--text)]">{label}</span>
              <span className="text-[11px] text-[color:var(--muted-text)]">{hint}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/settings/page.tsx
// Version: 2.0.0 — 2026-08-19
// Why: Real system settings. v1 was a placeholder that claimed «تمام
//      پارامترها در حالت استاندارد قرار دارند» over nothing — the exact
//      class of unbacked UI this project hunts down. v2 has three sections,
//      each backed by something real:
//        1. Smart search — kill switch + daily model-call cap
//           (site_settings), with live usage numbers from the ledger.
//        2. Backup & restore — snapshots into the private 'backups' bucket,
//           client-driven table by table (backup-manager.tsx).
//        3. Infrastructure — which of the out-of-band migrations this page
//           depends on are actually live, probed, not assumed. Migrations
//           here get applied through the SQL Editor (the CLI password
//           blocker), so "did it run?" is a real question worth answering
//           on screen.
// Env / Identity: Admin-only (the layout already gates the section; the API
//      routes re-check with requireAdmin).
// ============================================================================
import { Metadata } from "next";
import { Database, Download, Settings, Wand2 } from "lucide-react";

import { BACKUP_TABLES } from "@/lib/admin/backup-tables";
import { APP_VERSION } from "@/lib/data/releases";
import { SETTING_KEYS, getSetting } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { BackupManager } from "./backup-manager";
import { BusinessExport } from "./business-export";
import { SmartSearchSettings } from "./smart-search-settings";

export const metadata: Metadata = {
  title: "تنظیمات سیستم | داشبورد ادمین",
};
export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** Live smart-search usage + infra probes. Errors read as zero / a red probe, never a crash. */
async function loadStatus() {
  const admin = createSupabaseAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ count: newToday, error: expErr }, { count: cachedTotal }, { count: aiToday }] =
    await Promise.all([
      admin.from("search_ai_expansions").select("q_norm", { count: "exact", head: true }).gt("created_at", dayAgo),
      admin.from("search_ai_expansions").select("q_norm", { count: "exact", head: true }),
      admin.from("ai_usage").select("id", { count: "exact", head: true }).gt("created_at", dayAgo),
    ]);
  // Probe, don't assume: which pieces of infrastructure actually exist.
  // storage.list() succeeds (empty) on a missing bucket — getBucket is the
  // honest probe.
  const { error: settingsErr } = await admin.from("site_settings").select("key", { head: true, count: "exact" });
  const { data: backupsBucket } = await admin.storage.getBucket("backups");
  return { newToday, expErr, cachedTotal, aiToday, settingsErr, backupsBucket };
}

export default async function SettingsPage() {
  const cfg = await getSetting(SETTING_KEYS.smartSearch, { enabled: true, daily_cap: 300 });
  const { newToday, expErr, cachedTotal, aiToday, settingsErr, backupsBucket } = await loadStatus();
  const probes = [
    { name: "جدول site_settings (مایگریشن 20260830310000)", ok: !settingsErr },
    { name: "باکت backups (همان مایگریشن)", ok: !!backupsBucket },
    { name: "جدول search_ai_expansions (مایگریشن 20260830300000)", ok: !expErr },
  ];

  return (
    <div className="space-y-8 animate-in fade-in" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">تنظیمات سیستم</h1>
        <p className="text-[color:var(--muted-text)]">
          کلیدهای واقعی سیستم — هر چیزی که اینجا می‌بینی به یک جدول یا سرویس واقعی وصل است.
        </p>
      </div>

      {/* 1 — Smart search */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Wand2 className="h-6 w-6 text-[color:var(--lajvard)]" />
          <h2 className="text-lg font-bold text-[color:var(--text)]">جستجوی هوشمند</h2>
        </div>
        <p className="text-sm leading-7 text-[color:var(--muted-text)]">
          لایه‌ی فهم کوئری با مدل زبانی روی جستجوی واژگانی. هر کوئری یکتا فقط یک بار هزینه دارد و بعد
          برای همیشه از کش می‌آید. خاموش کردنش کل بلوک «جستجوی هوشمند» را از صفحه‌ی جستجو حذف می‌کند؛
          سقف روزانه فقط جلوی تماس‌های <b>جدید</b> با مدل را می‌گیرد (کش همچنان رایگان سرو می‌شود).
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          {[
            { label: "کوئری جدید امروز (پولی)", value: expErr ? "—" : fa(newToday ?? 0) },
            { label: "کل کوئری‌های کش‌شده", value: expErr ? "—" : fa(cachedTotal ?? 0) },
            { label: "سقف روزانه", value: fa(cfg.daily_cap) },
            { label: "مصرف AI مالکان امروز", value: fa(aiToday ?? 0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[color:var(--bg)] px-3 py-3">
              <div className="text-xl font-black text-[color:var(--text)]">{s.value}</div>
              <div className="mt-1 text-[11px] text-[color:var(--muted-text)]">{s.label}</div>
            </div>
          ))}
        </div>
        <SmartSearchSettings initial={cfg} />
      </section>

      {/* 2 — Backup & restore */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-[color:var(--annabi)]" />
          <h2 className="text-lg font-bold text-[color:var(--text)]">پشتیبان‌گیری و بازیابی</h2>
        </div>
        <BackupManager tables={BACKUP_TABLES} />
      </section>

      {/* 2b — Export businesses */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Download className="h-6 w-6 text-[color:var(--lajvard)]" />
          <h2 className="text-lg font-bold text-[color:var(--text)]">خروجی لیست کسب‌وکارها</h2>
        </div>
        <BusinessExport />
      </section>

      {/* 3 — Infrastructure probes */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-[color:var(--muted-text)]" />
          <h2 className="text-lg font-bold text-[color:var(--text)]">زیرساخت</h2>
        </div>
        <ul className="space-y-2 text-sm">
          {probes.map((p) => (
            <li key={p.name} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${p.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[color:var(--text)]">{p.name}</span>
              {!p.ok ? <span className="text-xs text-red-600">اجرا نشده — SQL را در SQL Editor اجرا کن</span> : null}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[color:var(--muted-text)]" dir="rtl">
          نسخه‌ی APK منتشرشده: <span dir="ltr">{APP_VERSION}</span> (از lib/data/releases.ts — همان چیزی که /download به کاربر می‌دهد)
        </p>
      </section>
    </div>
  );
}

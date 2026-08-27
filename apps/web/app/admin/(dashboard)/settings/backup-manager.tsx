// ============================================================================
// Source: app/admin/(dashboard)/settings/backup-manager.tsx
// Version: 1.0.0 — 2026-08-19
// Why: The backup/restore UI. The client drives the work table by table
//      against /api/admin/backup so the admin sees true per-table progress
//      and no single request fights the serverless time limit.
//
//      The restore path enforces its own safety rules in order:
//        1. an automatic fresh backup (kind: pre-restore) runs first, always;
//        2. the admin must type the backup id to confirm;
//        3. semantics are stated on screen: UPSERT by primary key — rows
//           from the backup are written back, rows created after it are NOT
//           deleted. For point-in-time disaster recovery, Supabase's own
//           dashboard backups are the tool, and the UI says so.
// ============================================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Archive, Download, HardDriveDownload, RotateCcw, X } from "lucide-react";

import type { BackupTable } from "@/lib/admin/backup-tables";
import { faNumber as fa } from "@goplaza/core";

type ManifestTable = { name: string; rows: number; bytes: number };
type Manifest = {
  id: string;
  created_at: string;
  created_by: string;
  kind: "manual" | "pre-restore";
  tables: ManifestTable[];
};

type Progress = { phase: string; done: number; total: number; detail: string };

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} MB`;

async function api<T>(body: object): Promise<T> {
  const res = await fetch("/api/admin/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || "خطای سرور");
  return json as T;
}

export function BackupManager({ tables }: { tables: BackupTable[] }) {
  const [backups, setBackups] = useState<Manifest[]>([]);
  const [bucketMissing, setBucketMissing] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<{ id: string; files: { name: string; url: string }[] } | null>(null);
  // Restore wizard state
  const [restoreTarget, setRestoreTarget] = useState<Manifest | null>(null);
  const [restoreTables, setRestoreTables] = useState<Set<string>>(new Set());
  const [confirmText, setConfirmText] = useState("");
  const [restoreReport, setRestoreReport] = useState<{ table: string; upserted: number; failed: number }[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backup");
      const json = (await res.json()) as { backups?: Manifest[]; bucketMissing?: boolean };
      setBackups(json.backups ?? []);
      setBucketMissing(!!json.bucketMissing);
    } catch {
      /* the probes section on the page reports infra problems */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/backup")
      .then((r) => r.json())
      .then((json: { backups?: Manifest[]; bucketMissing?: boolean }) => {
        if (!alive) return;
        setBackups(json.backups ?? []);
        setBucketMissing(!!json.bucketMissing);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /** Run a full backup; returns the manifest id, or null on failure. */
  const runBackup = useCallback(
    async (kind: "manual" | "pre-restore", withLogs: boolean): Promise<string | null> => {
      setError(null);
      try {
        const { backupId } = await api<{ backupId: string }>({ action: "start" });
        const selected = tables.filter((t) => t.core || withLogs);
        const results: ManifestTable[] = [];
        for (let i = 0; i < selected.length; i++) {
          const t = selected[i];
          setProgress({
            phase: kind === "pre-restore" ? "پشتیبان امن پیش از بازیابی" : "در حال پشتیبان‌گیری",
            done: i,
            total: selected.length,
            detail: t.label,
          });
          const r = await api<ManifestTable>({ action: "table", backupId, table: t.name });
          results.push(r);
        }
        setProgress({ phase: "ثبت مانیفست", done: selected.length, total: selected.length, detail: "" });
        await api({ action: "finish", backupId, tables: results, kind });
        await refresh();
        return backupId;
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا در پشتیبان‌گیری");
        return null;
      } finally {
        setProgress(null);
      }
    },
    [tables, refresh]
  );

  const startRestore = (m: Manifest) => {
    setRestoreTarget(m);
    setRestoreTables(new Set(m.tables.map((t) => t.name)));
    setConfirmText("");
    setRestoreReport(null);
    setError(null);
  };

  const runRestore = async () => {
    if (!restoreTarget || confirmText !== restoreTarget.id) return;
    setError(null);
    setRestoreReport(null);
    // Rule 1: fresh safety backup first, no opt-out.
    const safety = await runBackup("pre-restore", true);
    if (!safety) {
      setError("پشتیبان امن پیش از بازیابی شکست خورد — بازیابی انجام نشد.");
      return;
    }
    const chosen = restoreTarget.tables.filter((t) => restoreTables.has(t.name));
    const report: { table: string; upserted: number; failed: number }[] = [];
    try {
      for (let i = 0; i < chosen.length; i++) {
        const t = chosen[i];
        setProgress({ phase: "در حال بازیابی", done: i, total: chosen.length, detail: t.name });
        const r = await api<{ table: string; upserted: number; failed: number }>({
          action: "restore-table",
          backupId: restoreTarget.id,
          table: t.name,
        });
        report.push(r);
      }
      setRestoreReport(report);
      setRestoreTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در بازیابی");
      setRestoreReport(report); // what did finish, honestly
    } finally {
      setProgress(null);
    }
  };

  const download = async (id: string) => {
    setError(null);
    try {
      const { files } = await api<{ files: { name: string; url: string }[] }>({ action: "download", backupId: id });
      setDownloadLinks({ id, files });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا");
    }
  };

  if (bucketMissing) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        باکت <b>backups</b> هنوز ساخته نشده — مایگریشن <b dir="ltr">20260830310000</b> را در SQL Editor اجرا کن، بعد این صفحه را رفرش کن.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-7 text-[color:var(--muted-text)]">
        پشتیبان یعنی یک اسنپ‌شات از جدول‌های دیتابیس (JSONL، در باکت خصوصی <b>backups</b>).
        <b> شامل نمی‌شود:</b> فایل‌های Storage (لوگوها و عکس‌ها) و حساب‌های auth (رمزها نزد Supabase Auth است).
        بازیابی <b>upsert</b> است: ردیف‌های داخل پشتیبان برگردانده می‌شوند؛ ردیف‌هایی که بعد از پشتیبان ساخته
        شده‌اند حذف <b>نمی‌شوند</b>. برای بازگشت کامل به یک لحظه‌ی خاص، ابزار درست، بکاپ‌های خود Supabase
        (داشبورد → Database → Backups) است.
      </p>

      {/* Create */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!!progress}
          onClick={() => void runBackup("manual", includeLogs)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-5 text-sm font-bold text-[#f6f1e8] transition hover:bg-[#5A1124] disabled:opacity-50"
        >
          <Archive size={16} /> تهیه‌ی پشتیبان جدید
        </button>
        <label className="flex items-center gap-2 text-sm text-[color:var(--text)]">
          <input type="checkbox" checked={includeLogs} onChange={(e) => setIncludeLogs(e.target.checked)} className="h-4 w-4" />
          شامل لاگ‌ها و آمار (حجیم‌تر)
        </label>
      </div>

      {progress ? (
        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-4">
          <div className="flex items-center justify-between text-sm font-bold text-[color:var(--text)]">
            <span>{progress.phase}{progress.detail ? ` — ${progress.detail}` : ""}</span>
            <span>{fa(progress.done)} / {fa(progress.total)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full bg-[color:var(--lajvard)] transition-all"
              style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      {restoreReport ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-bold text-emerald-900">گزارش بازیابی:</div>
          <ul className="mt-2 space-y-1 text-emerald-900">
            {restoreReport.map((r) => (
              <li key={r.table} dir="rtl">
                <b dir="ltr">{r.table}</b>: {fa(r.upserted)} ردیف نوشته شد{r.failed ? `، ${fa(r.failed)} ردیف رد شد (مثلاً کاربر auth حذف‌شده)` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[color:var(--muted-text)]">
            <tr className="border-b border-[color:var(--line)]">
              <th className="p-2 text-right">شناسه</th>
              <th className="p-2 text-right">تاریخ</th>
              <th className="p-2 text-right">نوع</th>
              <th className="p-2 text-right">جدول‌ها</th>
              <th className="p-2 text-right">ردیف‌ها</th>
              <th className="p-2 text-right">حجم</th>
              <th className="p-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center text-[color:var(--muted-text)]">هنوز پشتیبانی گرفته نشده.</td></tr>
            ) : null}
            {backups.map((b) => {
              const rows = b.tables.reduce((n, t) => n + t.rows, 0);
              const bytes = b.tables.reduce((n, t) => n + t.bytes, 0);
              return (
                <tr key={b.id} className="border-b border-[color:var(--line)] last:border-0">
                  <td className="p-2 font-mono text-xs" dir="ltr">{b.id}</td>
                  <td className="p-2">{new Date(b.created_at).toLocaleString("fa-IR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-2">{b.kind === "pre-restore" ? "امنِ پیش از بازیابی" : "دستی"}</td>
                  <td className="p-2">{fa(b.tables.length)}</td>
                  <td className="p-2">{fa(rows)}</td>
                  <td className="p-2" dir="ltr">{mb(bytes)}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void download(b.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">
                        <Download size={12} /> دانلود
                      </button>
                      <button type="button" disabled={!!progress} onClick={() => startRestore(b)} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--annabi)] disabled:opacity-40">
                        <RotateCcw size={12} /> بازیابی
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {downloadLinks ? (
        <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[color:var(--text)]">فایل‌های {downloadLinks.id} (لینک‌ها ۱ ساعت معتبرند):</span>
            <button type="button" onClick={() => setDownloadLinks(null)}><X size={14} /></button>
          </div>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {downloadLinks.files.map((f) => (
              <li key={f.name}>
                <a href={f.url} download className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)] hover:underline" dir="ltr">
                  <HardDriveDownload size={12} /> {f.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Restore wizard */}
      {restoreTarget ? (
        <div className="rounded-2xl border-2 border-[color:var(--annabi)]/40 bg-[color:var(--annabi)]/5 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-2 font-black text-[color:var(--text)]">
              <AlertTriangle size={18} className="text-[color:var(--annabi)]" />
              بازیابی از <span dir="ltr" className="font-mono text-sm">{restoreTarget.id}</span>
            </h3>
            <button type="button" onClick={() => setRestoreTarget(null)}><X size={16} /></button>
          </div>
          <ul className="list-disc pr-5 text-sm leading-7 text-[color:var(--text)]/85">
            <li>ردیف‌های داخل پشتیبان با کلید اصلی <b>بازنویسی</b> می‌شوند (تغییرات بعد از آن تاریخ روی همان ردیف‌ها از بین می‌رود).</li>
            <li>ردیف‌هایی که بعد از پشتیبان ساخته شده‌اند دست نمی‌خورند و حذف نمی‌شوند.</li>
            <li>قبل از شروع، به‌صورت خودکار یک پشتیبان کامل تازه گرفته می‌شود — بدون استثنا.</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            {restoreTarget.tables.map((t) => (
              <label key={t.name} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${restoreTables.has(t.name) ? "border-[color:var(--annabi)] bg-white text-[color:var(--annabi)]" : "border-[color:var(--line)] bg-white/60 text-[color:var(--muted-text)]"}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={restoreTables.has(t.name)}
                  onChange={(e) => {
                    const next = new Set(restoreTables);
                    if (e.target.checked) next.add(t.name);
                    else next.delete(t.name);
                    setRestoreTables(next);
                  }}
                />
                <span dir="ltr">{t.name}</span> · {fa(t.rows)}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[color:var(--text)]">
              برای تأیید، شناسه‌ی پشتیبان را بنویس:
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={restoreTarget.id}
                dir="ltr"
                className="h-10 w-56 rounded-lg border border-[color:var(--line)] bg-white px-3 font-mono text-xs outline-none focus:border-[color:var(--annabi)]"
              />
            </label>
            <button
              type="button"
              disabled={confirmText !== restoreTarget.id || restoreTables.size === 0 || !!progress}
              onClick={() => void runRestore()}
              className="h-10 rounded-full bg-[color:var(--annabi)] px-5 text-sm font-black text-[#f6f1e8] transition hover:bg-[#5A1124] disabled:opacity-40"
            >
              بازیابی {fa(restoreTables.size)} جدول
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/reports/reports-client.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Read a report, open the listing, resolve or reject it with a note.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Eye, Pencil, ShieldAlert, X } from "lucide-react";

import { updateReport } from "./actions";
import { restoreLinkPage, suspendLinkPage } from "@/lib/actions/link-page";

export type ReportRow = {
  id: string; business_id: string | null; reporter_id: string | null; reason: string; details: string | null;
  contact: string | null; status: "new" | "reviewing" | "resolved" | "rejected"; admin_note: string | null;
  source: string; created_at: string;
  business: { id: string; name: string; slug: string | null; city: string | null; status: string } | null;
  /** Set instead of `business` when the report is about a GPLZ Link bio page. */
  link_page: { id: string; handle: string; title: string | null; status: string; suspended_reason: string | null } | null;
  reporter?: { email: string | null; full_name: string | null } | null;
};

const REASON_FA: Record<string, string> = {
  closed: "تعطیل شده", wrong_info: "اطلاعات اشتباه", duplicate: "تکراری", not_iranian: "ایرانی نیست",
  spam: "اسپم", offensive: "محتوای نامناسب", impersonation: "جعل هویت", other: "مورد دیگر",
};
const fa = (n: number) => n.toLocaleString("fa-IR");
const when = (iso: string) => new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });

export function ReportsClient({ rows }: { rows: ReportRow[] }) {
  const [filter, setFilter] = useState<"new" | "reviewing" | "resolved" | "all">("new");
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [suspendReasons, setSuspendReasons] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    reviewing: rows.filter((r) => r.status === "reviewing").length,
    resolved: rows.filter((r) => r.status === "resolved" || r.status === "rejected").length,
  };
  const visible = rows.filter((r) => (filter === "all" ? true : filter === "resolved" ? r.status === "resolved" || r.status === "rejected" : r.status === filter));

  const act = (id: string, status: ReportRow["status"]) =>
    start(async () => {
      const r = await updateReport(id, status, notes[id]);
      if (!r.success) setMsg(r.error ?? "خطا");
    });

  const suspend = (pageId: string) =>
    start(async () => {
      const r = await suspendLinkPage(pageId, suspendReasons[pageId] ?? "");
      if (!r.success) setMsg(r.error ?? "خطا");
      else router.refresh();
    });

  const restore = (pageId: string) =>
    start(async () => {
      const r = await restoreLinkPage(pageId);
      if (!r.success) setMsg(r.error ?? "خطا");
      else router.refresh();
    });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">گزارش تخلفات</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-text)]">گزارش‌هایی که کاربران درباره‌ی آگهی‌ها فرستاده‌اند. {fa(rows.length)} مورد.</p>
      </div>
      {msg ? <p className="rounded-xl bg-[color:var(--annabi)]/10 px-4 py-2 text-sm font-bold text-[color:var(--annabi)]">{msg}</p> : null}

      <div className="flex flex-wrap gap-2 text-sm">
        {([["new", `جدید (${fa(counts.new)})`], ["reviewing", `در بررسی (${fa(counts.reviewing)})`], ["resolved", `بسته‌شده (${fa(counts.resolved)})`], ["all", "همه"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1.5 font-bold ${filter === k ? "border-transparent bg-[color:var(--text)] text-[#f6f1e8]" : "border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>{label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[color:var(--line)] bg-white p-12 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-[color:var(--muted-text)]" />
          <p className="font-bold text-[color:var(--text)]">چیزی در این دسته نیست.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className={`rounded-2xl border bg-white p-4 md:p-5 ${r.status === "new" ? "border-[color:var(--annabi)]/30" : "border-[color:var(--line)]"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-text)]">
                <span className="rounded-full bg-[color:var(--annabi)]/8 px-2.5 py-1 font-bold text-[color:var(--annabi)]">{REASON_FA[r.reason] ?? r.reason}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${r.status === "new" ? "bg-[color:var(--gold)]/20 text-[color:var(--text)]" : r.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100"}`}>{r.status}</span>
                <span>{when(r.created_at)}</span>
                <span>· {r.source === "mobile" ? "اپ" : "وب"}</span>
                <span>· {r.reporter ? r.reporter.full_name || r.reporter.email : "ناشناس"}</span>
                {r.contact ? <span dir="ltr">· {r.contact}</span> : null}
              </div>

              {r.link_page ? (
                <div className="mb-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[color:var(--text)]">{r.link_page.title || `gplz.link/${r.link_page.handle}`}</strong>
                    <span className="rounded-full bg-[color:var(--lajvard)]/8 px-2 py-0.5 text-[11px] font-bold text-[color:var(--lajvard)]">صفحه‌ی لینک</span>
                    <span dir="ltr" className="text-xs text-[color:var(--muted-text)]">/{r.link_page.handle}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.link_page.status === "live" ? "bg-emerald-50 text-emerald-700" : r.link_page.status === "suspended" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                      {r.link_page.status === "live" ? "منتشر" : r.link_page.status === "suspended" ? "تعلیق" : "پیش‌نویس"}
                    </span>
                    <Link href={`/link/${r.link_page.handle}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">مشاهده <ExternalLink size={11} /></Link>
                  </div>
                  {r.link_page.status === "suspended" ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[color:var(--muted-text)]">دلیل تعلیق: {r.link_page.suspended_reason}</span>
                      <button type="button" disabled={pending} onClick={() => restore(r.link_page!.id)} className="rounded-lg border border-[color:var(--line)] bg-white px-2.5 py-1 font-bold">
                        رفع تعلیق (بازگشت به پیش‌نویس)
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={suspendReasons[r.link_page.id] ?? ""}
                        onChange={(e) => setSuspendReasons((m) => ({ ...m, [r.link_page!.id]: e.target.value }))}
                        placeholder="دلیل تعلیق (صاحب صفحه آن را می‌بیند)…"
                        className="h-8 min-w-[220px] rounded-lg border border-[color:var(--line)] bg-[color:var(--bg)] px-2.5 text-xs outline-none focus:bg-white"
                      />
                      {/* Disabled until a reason is typed: the database refuses
                          a reasonless suspension anyway, so an enabled button
                          would only ever produce an error. */}
                      <button type="button" disabled={pending || !(suspendReasons[r.link_page.id] ?? "").trim()} onClick={() => suspend(r.link_page!.id)} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40">
                        تعلیق صفحه
                      </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <strong className="text-[color:var(--text)]">{r.business?.name ?? "کسب‌وکار حذف‌شده"}</strong>
                {r.business?.city ? <span className="text-xs text-[color:var(--muted-text)]">{r.business.city}</span> : null}
                {r.business?.slug ? (
                  <>
                    <Link href={`/businesses/${r.business.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">مشاهده <ExternalLink size={11} /></Link>
                    <Link href={`/admin/listings/${r.business.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--text)]">ویرایش <Pencil size={11} /></Link>
                  </>
                ) : null}
              </div>
              )}

              {r.details ? <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--text)]">{r.details}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  defaultValue={r.admin_note ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="یادداشت داخلی…"
                  className="h-9 min-w-[200px] flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:bg-white"
                />
                {r.status === "new" ? <button type="button" disabled={pending} onClick={() => act(r.id, "reviewing")} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><Eye size={14} /> در بررسی</button> : null}
                {r.status !== "resolved" ? <button type="button" disabled={pending} onClick={() => act(r.id, "resolved")} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[color:var(--success,#0f7b4f)] px-3 text-sm font-bold text-white"><Check size={14} /> رسیدگی شد</button> : null}
                {r.status !== "rejected" ? <button type="button" disabled={pending} onClick={() => act(r.id, "rejected")} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold text-[color:var(--muted-text)]"><X size={14} /> رد</button> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

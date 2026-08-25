// ============================================================================
// Source: app/admin/(dashboard)/listings/listings-client.tsx
// Version: 2.0.0 — 2026-08-25 (server-backed search; one-click moderation)
// Why: Interactive client component for managing businesses.
//
//      Search and the status filter used to run over an in-memory array of
//      every listing. They now write to the URL and the server re-queries, so
//      a search covers all 10,683 rows instead of the 1,000 that happened to
//      be loaded. Typing is debounced so each keystroke is not a round trip.
//
//      Moderation is three buttons, not a dropdown. The dropdown made the two
//      decisions an admin makes hundreds of times — publish it, send it back —
//      cost a click to open, a read of six options, a click to choose and a
//      confirm() to dismiss. Approve and «نیازمند اصلاح» now act immediately;
//      only the destructive ones (reject, delete) still confirm, and the rare
//      statuses stay in the dropdown.
// Env / Identity: Client-side component with actions.
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Search, Trash2, Loader2, Building2, ExternalLink, Undo2 } from "lucide-react";

import { updateBusinessStatus, deleteBusiness } from "./actions";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Business {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  city: string;
  status: string;
  created_at: string;
  created_by: string;
  profiles: Profile;
}

interface ListingsClientProps {
  businesses: Business[];
  q: string;
  status: string;
  pagination: React.ReactNode;
}

const statusLabels: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "در انتظار تایید",
  NEEDS_CHANGES: "نیازمند اصلاح",
  APPROVED: "تایید شده",
  PUBLISHED: "منتشر شده",
  REJECTED: "رد شده"
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700 border border-blue-200",
  NEEDS_CHANGES: "bg-amber-100 text-amber-700",
  APPROVED: "bg-teal-100 text-teal-700",
  PUBLISHED: "bg-green-100 text-green-700 border border-green-200",
  REJECTED: "bg-red-100 text-red-700"
};

export default function ListingsClient({ businesses, q, status, pagination }: ListingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(q);

  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  // The row's status as this browser last saw it, so an accidental publish can
  // be put back without hunting for what it used to be.
  const [undoable, setUndoable] = useState<Record<string, string>>({});

  /** Rewrite the query string; the server does the filtering. */
  const push = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    // Any new filter or search invalidates the page number.
    params.delete("page");
    const s = params.toString();
    startTransition(() => router.push(s ? `/admin/listings?${s}` : "/admin/listings"));
  };

  // Debounced search: a keystroke should not be a query.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (search.trim() !== q) push({ q: search.trim() });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const applyStatus = (id: string, newStatus: string, previous: string) => {
    setProcessingId(id);
    setUndoable((u) => ({ ...u, [id]: previous }));
    startTransition(async () => {
      const result = await updateBusinessStatus(id, newStatus);
      if (!result.success) {
        alert(result.error);
        setUndoable((u) => {
          const { [id]: _drop, ...rest } = u;
          return rest;
        });
      }
      setProcessingId(null);
    });
  };

  /**
   * Publishing and asking for changes are the everyday decisions and act at
   * once — an undo is kinder than a confirm() on something reversible.
   * Rejection is not everyday, and it emails the owner, so it still asks.
   */
  const handleStatusChange = (id: string, newStatus: string, previous: string) => {
    const needsConfirm = newStatus === "REJECTED";
    if (needsConfirm && !confirm(`آیا از تغییر وضعیت این کسب‌وکار به "${statusLabels[newStatus]}" مطمئن هستید؟`)) return;
    applyStatus(id, newStatus, previous);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`آیا از حذف کامل کسب‌وکار "${name}" مطمئن هستید؟ این عملیات غیرقابل بازگشت است!`)) {
      setProcessingId(id);
      startTransition(async () => {
        const result = await deleteBusiness(id);
        if (!result.success) alert(result.error);
        setProcessingId(null);
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="admin-panel-card p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-[color:var(--line)] rounded-2xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-text)]" size={18} />
          <input
            type="text"
            placeholder="جستجوی کسب‌وکار یا ایمیل صاحب آن..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-4 pr-10 rounded-xl border border-[color:var(--line)] bg-gray-50 focus:bg-white outline-none focus:border-[color:var(--lajvard)] transition text-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm text-[color:var(--muted-text)] whitespace-nowrap">وضعیت:</span>
          <select
            value={status || "ALL"}
            onChange={(e) => push({ status: e.target.value === "ALL" ? "" : e.target.value })}
            className="h-10 px-3 py-2 bg-gray-50 border border-[color:var(--line)] rounded-xl text-sm focus:border-[color:var(--lajvard)] outline-none min-w-[150px]"
          >
            <option value="ALL">همه کسب‌وکارها</option>
            {Object.entries(statusLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="admin-panel-card p-0 overflow-hidden bg-white border border-[color:var(--line)] rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b border-[color:var(--line)]">
              <tr>
                <th className="px-6 py-4 font-bold text-[color:var(--text)]">کسب‌وکار</th>
                <th className="px-6 py-4 font-bold text-[color:var(--text)]">دسته بندی / شهر</th>
                <th className="px-6 py-4 font-bold text-[color:var(--text)]">سازنده</th>
                <th className="px-6 py-4 font-bold text-[color:var(--text)]">وضعیت بررسی</th>
                <th className="px-6 py-4 font-bold text-[color:var(--text)]">تاریخ ثبت</th>
                <th className="px-6 py-4 font-bold text-[color:var(--text)] text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {businesses.length > 0 ? (
                businesses.map((b) => {
                  const isProcessing = processingId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[color:var(--lajvard)]/10 text-[color:var(--lajvard)] flex items-center justify-center shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <strong className="block text-[color:var(--text)]">{b.name}</strong>
                            {b.name_en && <span className="block text-xs text-[color:var(--muted-text)]" dir="ltr">{b.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[color:var(--muted-text)]">
                        {b.category} <br />
                        <span className="text-xs">{b.city}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs text-[color:var(--text)]">{b.profiles?.full_name || "کاربر ناشناس"}</span>
                        <span className="block text-xs text-[color:var(--muted-text)]">{b.profiles?.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {isProcessing && <Loader2 size={14} className="animate-spin text-[color:var(--lajvard)]" />}
                            <select
                              value={b.status}
                              disabled={isProcessing || isPending}
                              onChange={(e) => handleStatusChange(b.id, e.target.value, b.status)}
                              className={`text-xs px-2 py-1 rounded-full border outline-none font-medium appearance-none cursor-pointer ${statusColors[b.status] || "bg-gray-100"}`}
                            >
                              {Object.entries(statusLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          </div>

                          {/* The two everyday decisions, one click each. Hidden
                              when the row is already in that state, so the
                              button never offers a change it would not make. */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.status !== "PUBLISHED" ? (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "PUBLISHED", b.status)}
                                disabled={isProcessing || isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700 transition hover:bg-green-600 hover:text-white disabled:opacity-40"
                              >
                                <Check size={12} /> تایید
                              </button>
                            ) : null}
                            {b.status !== "NEEDS_CHANGES" ? (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "NEEDS_CHANGES", b.status)}
                                disabled={isProcessing || isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 transition hover:bg-amber-500 hover:text-white disabled:opacity-40"
                              >
                                اصلاح
                              </button>
                            ) : null}
                            {b.status !== "REJECTED" ? (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(b.id, "REJECTED", b.status)}
                                disabled={isProcessing || isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
                              >
                                رد
                              </button>
                            ) : null}
                            {undoable[b.id] && undoable[b.id] !== b.status ? (
                              <button
                                type="button"
                                onClick={() => applyStatus(b.id, undoable[b.id], b.status)}
                                disabled={isProcessing || isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] bg-white px-2 py-1 text-[11px] font-bold text-[color:var(--muted-text)] transition hover:bg-gray-50 disabled:opacity-40"
                                title={`بازگرداندن به «${statusLabels[undoable[b.id]]}»`}
                              >
                                <Undo2 size={12} /> بازگردانی
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[color:var(--muted-text)]" dir="ltr">
                        {formatDate(b.created_at)}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/listings/${b.id}`}
                            className="w-8 h-8 rounded-lg bg-gray-50 text-[color:var(--text)] flex items-center justify-center border border-[color:var(--line)] transition hover:bg-white hover:shadow-sm"
                            title="بررسی دقیق کسب‌وکار"
                          >
                            <ExternalLink size={16} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id, b.name)}
                            disabled={isProcessing || isPending}
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
                            title="حذف دائمی کسب‌وکار"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[color:var(--muted-text)]">
                    هیچ کسب‌وکاری با این مشخصات یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination}
      </div>
    </div>
  );
}

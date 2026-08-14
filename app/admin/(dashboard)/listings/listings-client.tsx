// ============================================================================
// Source: app/admin/(dashboard)/listings/listings-client.tsx
// Version: 1.0.0 — 2026-08-13
// Why: Interactive client component for filtering and managing businesses.
// Env / Identity: Client-side component with actions.
// ============================================================================
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, Trash2, Loader2, Building2, ExternalLink } from "lucide-react";

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

export default function ListingsClient({ businesses }: ListingsClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // Default could be SUBMITTED later, but ALL for now
  
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const filteredListings = businesses.filter((b) => {
    const matchesSearch = 
      b.name.includes(search) || 
      (b.name_en && b.name_en.toLowerCase().includes(search.toLowerCase())) ||
      b.profiles?.email.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === "ALL" ? true : b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    if (confirm(`آیا از تغییر وضعیت این کسب‌وکار به "${statusLabels[newStatus]}" مطمئن هستید؟`)) {
      setProcessingId(id);
      startTransition(async () => {
        const result = await updateBusinessStatus(id, newStatus);
        if (!result.success) alert(result.error);
        setProcessingId(null);
      });
    }
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
              {filteredListings.length > 0 ? (
                filteredListings.map((b) => {
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
                        <div className="flex items-center gap-2">
                          {isProcessing && <Loader2 size={14} className="animate-spin text-[color:var(--lajvard)]" />}
                          <select
                            value={b.status}
                            disabled={isProcessing || isPending}
                            onChange={(e) => handleStatusChange(b.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border outline-none font-medium appearance-none cursor-pointer ${statusColors[b.status] || "bg-gray-100"}`}
                          >
                            {Object.entries(statusLabels).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
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
      </div>
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/users/user-list-client.tsx
// Version: 2.0.0 — 2026-08-26 (four counted columns)
// Why: Interactive users list client panel with search, role filters, and online edit/delete.
//      v2 adds last activity, standing, the raw UID and money paid — all
//      aggregated on the server (see page.tsx) so a row renders what it was
//      handed rather than fetching per row.
//
//      Two labels are deliberately not what was asked for, because the data
//      does not support the shorter words:
//        · «آخرین فعالیت», not «آخرین ورود». A login is one of the actions in
//          user_activity_logs and not the only one, so the column names what
//          it actually holds and shows which action it was.
//        · «پرداخت‌شده», not «اعتبار». There is no wallet, no ledger and no
//          balance in this schema; the number is the sum of PAID invoices
//          against businesses this person owns. Calling that a credit balance
//          would be a badge with nothing behind it.
// Env / Identity: Client-side rendering, executes secure Server Actions.
// ============================================================================
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, Trash2, ShieldAlert, CheckCircle2, Loader2, User as UserIcon, Activity, Copy } from "lucide-react";

import { LEVEL_LABELS_FA, type StandingLevel } from "@goplaza/core";

import { updateUserRole, deleteUser } from "./actions";
import { Card, CardContent } from "@/components/ui/card";

export type ProfileUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at?: string;
  updated_at?: string;
  /** Newest user_activity_logs row. Null when the account has never done anything logged. */
  lastActivityAt: string | null;
  lastActivityAction: string | null;
  xp: number;
  level: StandingLevel;
  standingFrozen: boolean;
  /** Sum of PAID invoices, in the smallest currency unit. Not a balance. */
  paidCents: number;
  paidCurrency: string;
};

/** The actions user_activity_logs records, in Persian. Unknown ones show raw. */
const ACTION_FA: Record<string, string> = {
  LOGIN: "ورود",
  LOGOUT: "خروج",
  PROFILE_UPDATE: "ویرایش پروفایل",
  BUSINESS_CREATE: "ثبت کسب‌وکار",
  BUSINESS_UPDATE: "ویرایش کسب‌وکار",
  ROLE_CHANGE: "تغییر نقش",
};

type UserListClientProps = {
  initialUsers: ProfileUser[];
  currentUserId: string;
};

const roleLabels: Record<string, string> = {
  user: "کاربر عادی",
  business_owner: "صاحب کسب‌وکار",
  moderator: "ناظر سیستم",
  admin: "مدیر کل",
};

export function UserListClient({ initialUsers, currentUserId }: UserListClientProps) {
  const [users, setUsers] = useState<ProfileUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filter users based on search & dropdown selection
  const filteredUsers = users.filter((user) => {
    const nameMatch = user.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false;
    const emailMatch = user.email?.toLowerCase().includes(search.toLowerCase()) ?? false;
    const roleMatch = roleFilter === "all" || user.role === roleFilter;
    
    return (nameMatch || emailMatch) && roleMatch;
  });

  /** «۳ روز پیش» — an admin scanning for dormant accounts wants the distance, not the date. */
  const relative = (iso: string | null) => {
    if (!iso) return null;
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days < 0) return "همین حالا";
    if (days === 0) return "امروز";
    if (days === 1) return "دیروز";
    if (days < 30) return `${days.toLocaleString("fa-IR")} روز پیش`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months.toLocaleString("fa-IR")} ماه پیش`;
    return `${Math.floor(months / 12).toLocaleString("fa-IR")} سال پیش`;
  };

  const money = (cents: number, currency: string) =>
    `${(cents / 100).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "نامشخص";
    try {
      return new Date(dateStr).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionError(null);
    setActionSuccess(null);
    setProcessingUserId(userId);

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      setProcessingUserId(null);

      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setActionSuccess("نقش کاربر با موفقیت به‌روزرسانی شد.");
      } else {
        setActionError(result.error ?? "خطایی رخ داد.");
      }
    });
  };

  const handleDelete = async (userId: string, email: string | null) => {
    const isSelf = userId === currentUserId;
    if (isSelf) {
      setActionError("شما نمی‌توانید حساب کاربری خودتان را حذف کنید!");
      return;
    }

    const confirmed = window.confirm(
      `آیا از حذف کامل کاربر "${email ?? "نامشخص"}" مطمئن هستید؟ این عمل غیرقابل بازگشت است.`
    );

    if (!confirmed) return;

    setActionError(null);
    setActionSuccess(null);
    setProcessingUserId(userId);
    setDeleteTargetId(userId);

    startTransition(async () => {
      const result = await deleteUser(userId);
      setProcessingUserId(null);
      setDeleteTargetId(null);

      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setActionSuccess(`کاربر "${email}" با موفقیت حذف شد.`);
      } else {
        setActionError(result.error ?? "حذف کاربر با خطا مواجه شد.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text)]">مدیریت کاربران پلتفرم</h1>
          <p className="text-sm text-[color:var(--muted-text)] mt-1">
            مشاهده، فیلتر، ویرایش نقش‌ها و حذف حساب‌های کاربری واقعی دایرکتوری گوپلازا
          </p>
        </div>
        <div className="text-sm bg-white border border-[color:var(--line)] px-4 py-2 rounded-2xl shadow-sm">
          تعداد کل کاربران: <strong>{users.length}</strong> نفر
        </div>
      </div>

      {/* Success/Error Alerts */}
      {actionError && (
        <div className="auth-alert is-error">
          <ShieldAlert size={18} className="flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="auth-alert is-success">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search and Filters Block */}
      <Card className="admin-panel-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-[color:var(--muted-text)]">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو بر اساس نام کامل یا نشانی ایمیل..."
                className="w-full min-h-12 pr-11 pl-4 rounded-xl border border-[color:var(--line)] bg-white/70 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--lajvard)] focus:ring-1 focus:ring-[color:var(--lajvard)]"
              />
            </div>

            {/* Role Filter select */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full min-h-12 px-4 rounded-xl border border-[color:var(--line)] bg-white/70 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--lajvard)] focus:ring-1 focus:ring-[color:var(--lajvard)]"
              >
                <option value="all">همه نقش‌ها</option>
                <option value="user">کاربر عادی (user)</option>
                <option value="business_owner">صاحب کسب‌وکار (business_owner)</option>
                <option value="moderator">ناظر سیستم (moderator)</option>
                <option value="admin">مدیر کل (admin)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table Card */}
      <Card className="admin-panel-card">
        <CardContent className="p-0">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>کاربر</th>
                  <th>ایمیل</th>
                  <th>نقش سیستم</th>
                  <th>آخرین فعالیت</th>
                  <th>امتیاز</th>
                  <th>پرداخت‌شده</th>
                  <th>تاریخ عضویت</th>
                  <th>UID</th>
                  <th className="text-left pl-6">عملیات مدیریت</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isRowProcessing = processingUserId === user.id;

                    return (
                      <tr key={user.id} className={isSelf ? "bg-amber-50/30" : ""}>
                        {/* Avatar & Name */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[color:var(--bg)] flex items-center justify-center text-[color:var(--muted-text)] font-semibold border border-[color:var(--line)]">
                              {user.full_name ? user.full_name[0] : <UserIcon size={18} />}
                            </div>
                            <div>
                              <strong className="text-[color:var(--text)]">
                                {user.full_name || "نامشخص"}
                              </strong>
                              {isSelf && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full mr-2">
                                  شما
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td>{user.email || "بدون ایمیل"}</td>

                        {/* Role Select Dropdown */}
                        <td>
                          <div className="flex items-center gap-2">
                            {isRowProcessing && deleteTargetId !== user.id ? (
                              <Loader2 size={16} className="animate-spin text-[color:var(--lajvard)]" />
                            ) : null}
                            <select
                              value={user.role ?? "user"}
                              disabled={isSelf || isRowProcessing || isPending}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="text-xs bg-white border border-[color:var(--line)] rounded-lg px-2 py-1 outline-none focus:border-[color:var(--lajvard)] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <option value="user">{roleLabels.user}</option>
                              <option value="business_owner">{roleLabels.business_owner}</option>
                              <option value="moderator">{roleLabels.moderator}</option>
                              <option value="admin">{roleLabels.admin}</option>
                            </select>
                          </div>
                        </td>

                        {/* Last activity. Names the action, because this is
                            not a login column — see the header note. */}
                        <td>
                          {user.lastActivityAt ? (
                            <span title={formatDate(user.lastActivityAt)}>
                              <span className="block text-[color:var(--text)]">{relative(user.lastActivityAt)}</span>
                              <span className="block text-[11px] text-[color:var(--muted-text)]">
                                {user.lastActivityAction
                                  ? (ACTION_FA[user.lastActivityAction] ?? user.lastActivityAction)
                                  : null}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[color:var(--muted-text)]">فعالیتی ثبت نشده</span>
                          )}
                        </td>

                        {/* Standing. Zero and تازه‌وارد are a real state, not a
                            placeholder — a new account has no standing. */}
                        <td>
                          <span className="block font-bold text-[color:var(--text)]">
                            {user.xp.toLocaleString("fa-IR")}
                          </span>
                          <span className="block text-[11px] text-[color:var(--muted-text)]">
                            {LEVEL_LABELS_FA[user.level]}
                            {user.standingFrozen ? " · مسدود" : ""}
                          </span>
                        </td>

                        {/* Money received, not a balance. */}
                        <td>
                          {user.paidCents > 0 ? (
                            <span className="font-bold text-[color:var(--text)]">
                              {money(user.paidCents, user.paidCurrency)}
                            </span>
                          ) : (
                            <span className="text-[color:var(--muted-text)]">بدون پرداخت</span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td>{formatDate(user.created_at)}</td>

                        {/* UID. Truncated to stay readable, copied whole. */}
                        <td>
                          <button
                            type="button"
                            dir="ltr"
                            onClick={() => {
                              void navigator.clipboard?.writeText(user.id);
                              setActionSuccess(`UID کپی شد: ${user.id}`);
                            }}
                            title={user.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] bg-gray-50 px-2 py-1 font-mono text-[11px] text-[color:var(--muted-text)] transition hover:bg-gray-100"
                          >
                            <Copy size={11} />
                            {user.id.slice(0, 8)}
                          </button>
                        </td>

                        {/* Actions (Delete User) */}
                        <td className="text-left pl-6">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="w-8 h-8 rounded-lg bg-gray-50 text-[color:var(--text)] flex items-center justify-center border border-[color:var(--line)] transition hover:bg-gray-100"
                              title="مشاهده تاریخچه فعالیت‌ها"
                            >
                              <Activity size={16} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id, user.email)}
                              disabled={isSelf || isRowProcessing || isPending}
                              className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 transition hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-600"
                              title={isSelf ? "شما نمی‌توانید خودتان را حذف کنید" : "حذف کامل کاربر"}
                            >
                              {isRowProcessing && deleteTargetId === user.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[color:var(--muted-text)]">
                      هیچ کاربری با مشخصات جستجو شده یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/listings/[id]/ownership-panel.tsx
// Version: 1.0.0 — 2026-08-27
// Why: The admin's hand-operated version of the ownership path. Search a
//      registered user, say why, hand the listing over — and decide the badge
//      separately, because "who runs this" and "a contact point was proven"
//      are two different claims.
// Env / Identity: Client component; every write is a server action that
//      re-checks the admin role.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Search, ShieldOff, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  assignBusinessOwner,
  clearBusinessOwner,
  searchUsers,
  type UserHit,
} from "../ownership-actions";

type Props = {
  businessId: string;
  /** Current owner_user_id — NOT created_by. The two are different columns
   *  and treating them as one is the oldest recurring bug in this codebase. */
  currentOwner: { id: string; email: string | null; full_name: string | null } | null;
  verified: boolean;
};

export function OwnershipPanel({ businessId, currentOwner, verified }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<UserHit[] | null>(null);
  const [picked, setPicked] = useState<UserHit | null>(null);
  const [reason, setReason] = useState("");
  const [grantBadge, setGrantBadge] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearReason, setClearReason] = useState("");

  const runSearch = () =>
    start(async () => {
      const r = await searchUsers(q);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setHits(r.users);
    });

  const assign = () => {
    if (!picked) return;
    start(async () => {
      const r = await assignBusinessOwner(businessId, picked.id, reason, grantBadge);
      if (!r.success) {
        toast.error(r.error ?? "خطا");
        return;
      }
      toast.success(r.message ?? "ثبت شد.");
      setPicked(null);
      setHits(null);
      setQ("");
      setReason("");
      setGrantBadge(false);
      router.refresh();
    });
  };

  const clear = () =>
    start(async () => {
      const r = await clearBusinessOwner(businessId, clearReason);
      if (!r.success) {
        toast.error(r.error ?? "خطا");
        return;
      }
      toast.success(r.message ?? "برداشته شد.");
      setClearing(false);
      setClearReason("");
      router.refresh();
    });

  const label = (u: { email: string | null; full_name: string | null }) =>
    u.full_name || u.email || "بدون نام";

  return (
    <div className="space-y-4 text-sm" dir="rtl">
      {/* What is true right now */}
      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-4">
        <div className="text-xs text-[color:var(--muted-text)]">مالک فعلی (owner_user_id)</div>
        {currentOwner ? (
          <>
            <strong className="mt-1 block text-[color:var(--text)]">{label(currentOwner)}</strong>
            {currentOwner.email ? (
              <span className="text-xs text-[color:var(--muted-text)]" dir="ltr">
                {currentOwner.email}
              </span>
            ) : null}
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {verified ? (
                <>
                  <BadgeCheck size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">نشان تأیید فعال است</span>
                </>
              ) : (
                <span className="text-[color:var(--muted-text)]">نشان تأیید ندارد</span>
              )}
            </div>
          </>
        ) : (
          <strong className="mt-1 block text-[color:var(--muted-text)]">
            هیچ‌کس — این آگهی هنوز به حسابی وصل نیست
          </strong>
        )}
      </div>

      {/* Pick a user */}
      <div>
        <label className="mb-1.5 block text-xs font-bold text-[color:var(--text)]">
          واگذاری به کاربر ثبت‌نام‌شده
        </label>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="ایمیل یا نام کاربر…"
            className="h-10 min-w-0 flex-1 rounded-xl border border-[color:var(--line)] bg-white px-3 outline-none focus:border-[color:var(--lajvard)]"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={pending || q.trim().length < 2}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[color:var(--line)] bg-white px-3 font-bold disabled:opacity-40"
          >
            <Search size={15} /> جستجو
          </button>
        </div>

        {hits && !picked ? (
          hits.length ? (
            <ul className="mt-2 divide-y divide-[color:var(--line)] overflow-hidden rounded-xl border border-[color:var(--line)] bg-white">
              {hits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(u)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right hover:bg-[color:var(--bg)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-[color:var(--text)]">{label(u)}</span>
                      <span className="block truncate text-xs text-[color:var(--muted-text)]" dir="ltr">
                        {u.email}
                      </span>
                    </span>
                    <UserCheck size={15} className="shrink-0 text-[color:var(--lajvard)]" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--muted-text)]">
              کاربری با این ایمیل یا نام پیدا نشد. کاربر باید اول در پلازا حساب بسازد.
            </p>
          )
        ) : null}
      </div>

      {picked ? (
        <div className="space-y-3 rounded-xl border border-[color:var(--lajvard)]/30 bg-[color:var(--lajvard)]/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-[color:var(--muted-text)]">واگذاری به</div>
              <strong className="block truncate text-[color:var(--text)]">{label(picked)}</strong>
              <span className="block truncate text-xs text-[color:var(--muted-text)]" dir="ltr">
                {picked.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="rounded-lg p-1 text-[color:var(--muted-text)] hover:bg-white"
              aria-label="انصراف"
            >
              <X size={15} />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">
              دلیل (اجباری — در صف درخواست‌های مالکیت ثبت می‌شود)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: شماره‌ی آگهی دیگر در دسترسش نیست؛ مدارک را ایمیل کرد."
              className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 outline-none focus:border-[color:var(--lajvard)]"
            />
          </div>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={grantBadge}
              onChange={(e) => setGrantBadge(e.target.checked)}
              className="mt-1"
            />
            <span className="text-xs leading-6 text-[color:var(--text)]">
              <strong className="font-black">نشان تأیید را هم بده.</strong> شش ماه اعتبار، با روش
              «claimed»، و شماره‌ی همین آگهی به‌عنوان شماره‌ی اثبات‌شده ثبت می‌شود — یعنی اگر بعداً
              شماره عوض شود نشان خودبه‌خود برداشته می‌شود. فقط وقتی بزن که واقعاً چیزی را بررسی
              کرده‌ای.
            </span>
          </label>

          <button
            type="button"
            onClick={assign}
            disabled={pending || reason.trim().length < 3}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--annabi)] font-black text-[#f6f1e8] disabled:opacity-40"
          >
            {pending ? "در حال ثبت…" : "واگذاری مالکیت"}
          </button>
        </div>
      ) : null}

      {/* Taking it back */}
      {currentOwner ? (
        <div className="border-t border-[color:var(--line)] pt-3">
          {clearing ? (
            <div className="space-y-2">
              <input
                value={clearReason}
                onChange={(e) => setClearReason(e.target.value)}
                placeholder="دلیل سلب مالکیت…"
                className="h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 outline-none focus:border-red-400"
              />
              <p className="text-[11px] leading-6 text-[color:var(--muted-text)]">
                نشان تأیید هم با مالک برداشته می‌شود — نشانِ تأیید روی آگهی‌ای که مالک ندارد،
                ادعایی است بدون کسی پشتش.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clear}
                  disabled={pending || clearReason.trim().length < 3}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-xs font-bold text-white disabled:opacity-40"
                >
                  <ShieldOff size={14} /> سلب مالکیت
                </button>
                <button
                  type="button"
                  onClick={() => setClearing(false)}
                  className="h-9 rounded-xl border border-[color:var(--line)] bg-white px-3 text-xs font-bold"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setClearing(true)}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              سلب مالکیت از این کاربر
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

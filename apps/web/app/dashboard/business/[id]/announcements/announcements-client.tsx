// ============================================================================
// Source: app/dashboard/business/[id]/announcements/announcements-client.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The form and the list. The quota is enforced server-side in
//      lib/actions/announcements.ts; this just shows the count so hitting
//      the limit isn't a surprise, and disables the form past it with an
//      upsell instead of letting the submit fail silently.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/announcements";
import { faNumber as fa } from "@goplaza/core";

export type AnnouncementRow = { id: string; title: string; body: string | null; expires_at: string | null; created_at: string };

const date = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "medium" });

export function AnnouncementsClient({
  businessId,
  announcements,
  limit,
  usedThisWindow,
  nextPlanName,
}: {
  businessId: string;
  announcements: AnnouncementRow[];
  /** `null` = unlimited. */
  limit: number | null;
  usedThisWindow: number;
  nextPlanName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("14");

  const atLimit = limit !== null && usedThisWindow >= limit;

  const submit = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createAnnouncement(businessId, {
        title,
        body,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      });
      if (result.success) {
        toast.success("اعلان منتشر شد");
        setTitle(""); setBody("");
        router.refresh();
      } else {
        toast.error(result.error || "خطا در ثبت اعلان");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteAnnouncement(id, businessId);
      if (result.success) { toast.success("اعلان حذف شد"); router.refresh(); }
      else toast.error(result.error || "خطا در حذف اعلان");
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {atLimit ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-5 text-sm text-[color:var(--text)]">
          به سقف اعلان‌های این ماه رسیدی.{" "}
          {nextPlanName ? (
            <Link href={`/dashboard/business/${businessId}/billing`} className="font-bold text-[color:var(--lajvard)] underline underline-offset-4">
              برای اعلان بیشتر به {nextPlanName} ارتقا بده
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
          <h2 className="mb-3 font-bold text-[color:var(--text)]">اعلان تازه</h2>
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان — مثلاً «۲۰٪ تخفیف تا آخر هفته»"
              maxLength={120}
              className="h-11 w-full rounded-xl border border-[color:var(--line)] px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="توضیح بیشتر (اختیاری)"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-[color:var(--line)] p-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-[color:var(--muted-text)]">مدت نمایش</label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="h-9 rounded-lg border border-[color:var(--line)] px-2 text-xs"
              >
                <option value="7">۷ روز</option>
                <option value="14">۱۴ روز</option>
                <option value="30">۳۰ روز</option>
                <option value="">تا حذف دستی</option>
              </select>
            </div>
            <Button type="button" onClick={submit} disabled={pending || !title.trim()} className="rounded-xl">
              {pending ? "در حال ثبت…" : "انتشار اعلان"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-bold text-[color:var(--text)]">اعلان‌های فعلی</h2>
        {announcements.length === 0 ? (
          <p className="rounded-2xl bg-[color:var(--bg)] p-5 text-center text-sm text-[color:var(--muted-text)]">هنوز اعلانی ثبت نشده.</p>
        ) : (
          <ul className="space-y-2">
            {announcements.map((a) => {
              const expired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
              return (
                <li key={a.id} className={`flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--line)] p-4 ${expired ? "bg-[color:var(--bg)] opacity-60" : "bg-white"}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Megaphone size={14} className="shrink-0 text-[color:var(--annabi)]" />
                      <span className="font-bold text-sm text-[color:var(--text)]">{a.title}</span>
                      {expired ? <span className="text-[10px] text-[color:var(--muted-text)]">(منقضی‌شده)</span> : null}
                    </div>
                    {a.body ? <p className="mt-1 text-xs text-[color:var(--muted-text)] leading-relaxed">{a.body}</p> : null}
                    <p className="mt-1 text-[11px] text-[color:var(--muted-text)]">
                      {date(a.created_at)} {a.expires_at ? `· تا ${date(a.expires_at)}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(a.id)} disabled={pending} className="shrink-0 text-[color:var(--muted-text)] hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/loyalty/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: Farjad's surface for «وفاداری مالک» (docs/16 phase 4): the master
//      switch, the tier ladder, and the Platinum waitlist in the order the
//      design promises.
//
//      THE SWITCH ON THIS PAGE MOVES REAL MONEY. Everything else in the admin
//      toggles a feature; this one changes what customers are charged at
//      renewal. The page says so above the switch, and the migration seeds it
//      off so a deploy can never start a discount — only a person can.
//
//      Carries its own requireAdmin: the layout gate is a race a fast page can
//      win (see 06-gotchas, the streaming-redirect entry).
// Env / Identity: Admin-only, re-checked here and in the API route.
// ============================================================================
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, Gift, ListOrdered } from "lucide-react";

import { PLATINUM_SEAT_CAP } from "@goplaza/core";

import { tableExists } from "@/lib/admin/table-exists";
import { NotAuthenticatedError, requireAdmin } from "@/lib/auth/require-admin";
import { getLoyaltySettings } from "@/lib/loyalty/settings";
import { platinumWaitlist } from "@/lib/loyalty/waitlist";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { LoyaltyEditor } from "./loyalty-editor";

export const metadata: Metadata = { title: "وفاداری مالک | داشبورد ادمین" };
export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default async function LoyaltyAdminPage() {
  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase);
  } catch (e) {
    redirect(e instanceof NotAuthenticatedError ? "/admin/login" : "/auth/login?error=unauthorized");
  }

  const admin = createSupabaseAdminClient();
  const settings = await getLoyaltySettings();

  // Probe rather than assume — this migration is applied by hand too — and
  // with tableExists rather than a HEAD select, which cannot tell "missing"
  // from "empty" (lib/admin/table-exists.ts).
  const applied = await tableExists(admin, "platinum_waitlist");

  const waitlist = applied ? await platinumWaitlist(admin) : [];
  const nowIso = new Date().toISOString();
  const { count: platinumTaken } = await admin
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("plan", "platinum")
    .or(`plan_until.is.null,plan_until.gte.${nowIso}`);
  const seatsLeft = Math.max(0, PLATINUM_SEAT_CAP - (platinumTaken ?? 0));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
          <Gift size={20} /> وفاداری مالک
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted-text)]">
          سابقه‌ی اشتراک از صورتحساب‌های پرداخت‌شده محاسبه می‌شود و هیچ‌جا ذخیره
          نمی‌شود. تخفیف فقط روی تمدیدهای آینده اثر دارد.
        </p>
      </header>

      <section className="rounded-xl border border-amber-400/60 bg-amber-50/40 p-4">
        <p className="text-sm font-bold text-[color:var(--text)]">
          این کلید پول واقعی جابه‌جا می‌کند.
        </p>
        <p className="mt-1 text-xs text-[color:var(--muted-text)]">
          تا وقتی خاموش است، هیچ تخفیفی نه پیشنهاد می‌شود و نه در Stripe اعمال
          می‌شود، و کارت وفاداری در صفحه‌ی مالک اصلاً رندر نمی‌شود. درصدها
          پیش‌فرض‌اند، نه تصمیم — قبل از روشن کردن، خودت تعیینشان کن.
        </p>
      </section>

      <LoyaltyEditor settings={settings} />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <ListOrdered size={16} /> فهرست انتظار پلاتینیوم
          <span className="text-xs font-normal text-[color:var(--muted-text)]">
            — {fa(seatsLeft)} از {fa(PLATINUM_SEAT_CAP)} جای خالی
          </span>
        </h2>
        {!applied ? (
          <p className="rounded-xl border border-red-300 bg-red-50/40 p-4 text-sm font-bold text-red-700">
            جدول platinum_waitlist پاسخ نمی‌دهد — مایگریشن 20260830450000 هنوز در
            SQL Editor اجرا نشده.
          </p>
        ) : waitlist.length === 0 ? (
          <p className="text-sm text-[color:var(--muted-text)]">کسی در فهرست انتظار نیست.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--line)]">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-right text-xs text-[color:var(--muted-text)]">
                  <th className="p-2 font-normal">#</th>
                  <th className="p-2 font-normal">کسب‌وکار</th>
                  <th className="p-2 font-normal">سابقه‌ی پیوسته</th>
                  <th className="p-2 font-normal">مجموع عمر</th>
                  <th className="p-2 font-normal">تاریخ ثبت</th>
                  <th className="p-2 font-normal">اطلاع داده شد</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((w, i) => (
                  <tr key={w.businessId} className="border-t border-[color:var(--line)]">
                    <td className="p-2 font-bold">{fa(i + 1)}</td>
                    <td className="p-2">{w.name}</td>
                    <td className="p-2">{fa(w.tenureMonths)} ماه</td>
                    <td className="p-2 text-[color:var(--muted-text)]">{fa(w.lifetimeMonths)} ماه</td>
                    <td className="p-2 text-[color:var(--muted-text)]">
                      {new Date(w.joinedAt).toLocaleDateString("fa-IR", { dateStyle: "medium" })}
                    </td>
                    <td className="p-2 text-[color:var(--muted-text)]">
                      {w.notifiedAt
                        ? new Date(w.notifiedAt).toLocaleDateString("fa-IR", { dateStyle: "medium" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 flex items-center gap-1 text-xs text-[color:var(--muted-text)]">
          <Clock size={13} /> ترتیب در لحظه‌ی خواندن از سابقه‌ی پیوسته محاسبه
          می‌شود، نه ذخیره‌شده. بودن در این فهرست رزرو نیست و «اطلاع داده شد» فقط
          وقتی پر می‌شود که واقعاً پیامی فرستاده شده باشد.
        </p>
      </section>
    </div>
  );
}

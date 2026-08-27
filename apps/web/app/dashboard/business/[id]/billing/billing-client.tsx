// ============================================================================
// Source: app/dashboard/business/[id]/billing/billing-client.tsx
// Version: 2.0.0 — 2026-08-19
// Why: The interactive half: monthly/annual/2-year switch, upgrade buttons
//      that call /api/stripe/checkout, the portal button, and the invoice
//      table.
//
//      v2: Platinum sells quarterly only and is capped at PLATINUM_SEAT_CAP
//      nationwide, so it cannot share the month/year/2year toggle Starter and
//      Premium use — it gets its own card with a fixed interval and a real
//      seat count, disabled once full (unless this business already holds
//      it). Plan names now come from `planOf(...).name`, not a hand-rolled
//      ternary — the ternary silently had no branch for a fourth plan id.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, CreditCard, Download, ExternalLink } from "lucide-react";

import { formatCad, planOf, INTERVAL_LABEL_FA, PLATINUM_SEAT_CAP, type BillingInterval, type Plan, type PlanId } from "@/lib/billing/plans";
import { faNumber as fa } from "@goplaza/core";

export type SubscriptionRow = {
  id: string; plan: string; status: string; interval: string | null;
  current_period_end: string | null; cancel_at_period_end: boolean; stripe_subscription_id: string;
};
export type InvoiceRow = {
  id: string; number: string | null; status: string | null; amount_paid: number | null;
  amount_due: number | null; currency: string; tax: number | null;
  hosted_invoice_url: string | null; invoice_pdf: string | null; created_at: string;
};

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "long" }) : "—");
const money = (cents: number | null, currency: string) =>
  cents === null ? "—" : `${(cents / 100).toLocaleString("fa-IR", { maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;

const STATUS_FA: Record<string, string> = {
  trialing: "دوره‌ی آزمایشی", active: "فعال", past_due: "پرداخت عقب‌افتاده", canceled: "لغو شده",
  unpaid: "پرداخت‌نشده", incomplete: "ناتمام", incomplete_expired: "منقضی", paused: "متوقف",
};

const TOGGLE_INTERVALS: BillingInterval[] = ["month", "year", "2year"];

export function BillingClient({
  businessId, planId, storedPlan, expired, until, hasCustomer, plans, platinumSeatsLeft, subscription, invoices,
}: {
  businessId: string; planId: PlanId; storedPlan: PlanId; expired: boolean; until: string | null;
  hasCustomer: boolean; plans: Plan[]; platinumSeatsLeft: number;
  subscription: SubscriptionRow | null; invoices: InvoiceRow[];
}) {
  const params = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (path: string, body: object) =>
    start(async () => {
      setError(null);
      try {
        const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error || "اتصال به Stripe ناموفق بود.");
        window.location.href = json.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  const checkoutState = params.get("checkout");
  const togglePlans = plans.filter((p) => p.id !== "platinum");
  const platinumPlan = plans.find((p) => p.id === "platinum");
  const platinumFull = platinumSeatsLeft <= 0 && planId !== "platinum";

  return (
    <div className="mt-6 space-y-6" dir="rtl">
      {checkoutState === "success" ? (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={18} /> پرداخت انجام شد. اگر پلن هنوز به‌روز نشده، چند ثانیه صبر کنید — تأیید از Stripe می‌آید.
        </p>
      ) : null}
      {checkoutState === "cancelled" ? (
        <p className="rounded-2xl bg-[color:var(--bg)] px-4 py-3 text-sm text-[color:var(--muted-text)]">پرداخت نیمه‌کاره رها شد. چیزی از حساب شما کم نشده است.</p>
      ) : null}
      {error ? <p className="rounded-2xl bg-[color:var(--annabi)]/10 px-4 py-3 text-sm font-bold text-[color:var(--annabi)]">{error}</p> : null}

      {/* Current state */}
      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[color:var(--muted-text)]">پلن فعلی</p>
            <p className="text-2xl font-black text-[color:var(--text)]">{planOf(planId).name}</p>
            {subscription ? (
              <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                وضعیت: {STATUS_FA[subscription.status] ?? subscription.status}
                {subscription.current_period_end ? ` · ${subscription.cancel_at_period_end ? "تا" : "تمدید در"} ${date(subscription.current_period_end)}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[color:var(--muted-text)]">ثبت و نشان تأیید در این پلن هم رایگان است.</p>
            )}
          </div>
          {hasCustomer ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => go("/api/stripe/portal", { businessId })}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[color:var(--text)] disabled:opacity-50"
            >
              <CreditCard size={16} /> مدیریت اشتراک و کارت
            </button>
          ) : null}
        </div>

        {expired ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-[color:var(--gold)]/15 px-4 py-3 text-xs leading-6 text-[color:var(--text)]">
            <AlertTriangle size={15} className="mt-0.5 flex-none" />
            دوره‌ی پرداخت‌شده‌ی پلن «{planOf(storedPlan).name}» در {date(until)} تمام شده است، پس امکانات به رایگان برگشته‌اند.
          </p>
        ) : null}
        {subscription?.cancel_at_period_end ? (
          <p className="mt-4 rounded-xl bg-[color:var(--bg)] px-4 py-3 text-xs leading-6 text-[color:var(--text)]">
            لغو ثبت شده است. امکانات تا {date(subscription.current_period_end)} فعال می‌مانند و بعد به رایگان برمی‌گردند.
          </p>
        ) : null}
      </section>

      {/* Upgrade — Starter / Premium, shared month/year/2-year toggle */}
      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[color:var(--text)]">ارتقا</h2>
          <div className="inline-flex flex-wrap rounded-full bg-[color:var(--bg)] p-1 text-sm">
            {TOGGLE_INTERVALS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInterval(i)}
                className={`rounded-full px-4 py-1.5 font-bold transition ${interval === i ? "bg-[color:var(--text)] text-[#f6f1e8]" : "text-[color:var(--text)]"}`}
              >
                {INTERVAL_LABEL_FA[i]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {togglePlans.map((plan) => {
            const current = plan.id === planId;
            const amount = plan.price[interval];
            if (amount === null) return null; // this plan doesn't sell the selected interval
            return (
              <div key={plan.id} className={`rounded-2xl border p-4 ${current ? "border-[color:var(--success,#0f7b4f)]/40 bg-emerald-50/40" : "border-[color:var(--line)]"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-black text-[color:var(--text)]">{plan.name}</h3>
                  <span className="text-sm font-black text-[color:var(--text)]">
                    {formatCad(amount)}<span className="text-xs font-normal text-[color:var(--muted-text)]">/{INTERVAL_LABEL_FA[interval]}</span>
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs leading-6 text-[color:var(--muted-text)]">
                  {plan.bullets.slice(0, 4).map((b) => <li key={b}>· {b}</li>)}
                </ul>
                <button
                  type="button"
                  disabled={pending || current}
                  onClick={() => go("/api/stripe/checkout", { businessId, plan: plan.id, interval })}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[color:var(--annabi)] text-sm font-black text-[#f6f1e8] transition hover:bg-[#5A1124] disabled:opacity-40"
                >
                  {current ? "پلن فعلی شما" : pending ? "…" : `ارتقا به ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-6 text-[color:var(--muted-text)]">
          قیمت‌ها بدون مالیات‌اند؛ GST/HST بر اساس استان شما هنگام پرداخت اضافه می‌شود. پرداخت روی صفحه‌ی امن Stripe انجام می‌شود و پلازا شماره‌ی کارت شما را نمی‌بیند و ذخیره نمی‌کند.
        </p>
      </section>

      {/* Platinum — its own card: fixed quarterly interval, real seat count */}
      {platinumPlan ? (
        <section className="rounded-3xl border border-[color:var(--gold)]/50 bg-[color:var(--gold)]/5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[color:var(--text)]">{platinumPlan.name}</h2>
              <p className="mt-1 max-w-md text-xs leading-6 text-[color:var(--muted-text)]">{platinumPlan.tagline}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[color:var(--text)]">
              {planId === "platinum"
                ? "پلن فعلی شما"
                : platinumFull
                  ? "ظرفیت تکمیل"
                  : `${fa(platinumSeatsLeft)} از ${fa(PLATINUM_SEAT_CAP)} جای باقی‌مانده`}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <div>
              <span className="text-lg font-black text-[color:var(--text)]">{formatCad(platinumPlan.price.quarter!)}</span>
              <span className="text-xs font-normal text-[color:var(--muted-text)]"> / سه‌ماه</span>
              <ul className="mt-2 space-y-1.5 text-xs leading-6 text-[color:var(--muted-text)]">
                {platinumPlan.bullets.map((b) => <li key={b}>· {b}</li>)}
              </ul>
            </div>
            <button
              type="button"
              disabled={pending || planId === "platinum" || platinumFull}
              onClick={() => go("/api/stripe/checkout", { businessId, plan: "platinum", interval: "quarter" })}
              className="h-10 shrink-0 rounded-full bg-[color:var(--annabi)] px-5 text-sm font-black text-[#f6f1e8] transition hover:bg-[#5A1124] disabled:opacity-40"
            >
              {planId === "platinum" ? "پلن فعلی شما" : platinumFull ? "ظرفیت تکمیل" : pending ? "…" : "خرید پلاتینیوم"}
            </button>
          </div>
        </section>
      ) : null}

      {/* Invoices */}
      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-5 md:p-6">
        <h2 className="mb-4 text-lg font-black text-[color:var(--text)]">فاکتورها</h2>
        {invoices.length === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--muted-text)]">هنوز فاکتوری صادر نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-[color:var(--muted-text)]">
                <tr className="border-b border-[color:var(--line)]">
                  <th className="p-2 text-right">شماره</th>
                  <th className="p-2 text-right">تاریخ</th>
                  <th className="p-2 text-right">مبلغ</th>
                  <th className="p-2 text-right">مالیات</th>
                  <th className="p-2 text-right">وضعیت</th>
                  <th className="p-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[color:var(--line)] last:border-0">
                    <td className="p-2 font-mono text-xs" dir="ltr">{inv.number ?? "—"}</td>
                    <td className="p-2">{date(inv.created_at)}</td>
                    <td className="p-2 font-bold">{money(inv.amount_paid ?? inv.amount_due, inv.currency)}</td>
                    <td className="p-2 text-[color:var(--muted-text)]">{money(inv.tax, inv.currency)}</td>
                    <td className="p-2">{inv.status === "paid" ? "پرداخت شده" : inv.status ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        {inv.hosted_invoice_url ? <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--lajvard)]">مشاهده <ExternalLink size={11} /></a> : null}
                        {inv.invoice_pdf ? <a href={inv.invoice_pdf} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--muted-text)]">PDF <Download size={11} /></a> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-[color:var(--muted-text)]">{fa(invoices.length)} فاکتور. نسخه‌ی رسمی هر فاکتور نزد Stripe نگهداری می‌شود.</p>
      </section>
    </div>
  );
}

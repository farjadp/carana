// ============================================================================
// Source: app/dashboard/business/[id]/link/link-analytics.tsx
// Version: 1.0.0 — 2026-08-25
// Why: What the bio page actually did. `link_page_summary` and the whole
//      rollup pipeline existed and nothing showed the owner a single number —
//      the same shape of gap the create button had.
//
//      THE WINDOW IS ALWAYS ON SCREEN. "۱۲۳ بازدید" without a period is not a
//      fact, and the free and paid tiers see different periods, so the label
//      is not decoration — it is what makes the number true.
//
//      NOTHING IS SHOWN THAT IS NOT MEASURED. No estimates, no smoothing, no
//      "coming soon" tiles. A day with zero events renders as zero rather than
//      being dropped, because a gap in a bar chart reads as missing data when
//      it actually means nobody came.
//
//      THE UPSELL ONLY APPEARS WHEN THERE IS SOMETHING BEHIND THE LOCK. It is
//      driven by the oldest day that genuinely holds data for this page, so a
//      free owner in their first week is never told they are missing history
//      that does not exist. That check reads one date, not the hidden rows.
// Env / Identity: Server Component. Reads through the caller's session, so
//      RLS on analytics_daily decides what is visible.
// ============================================================================
import { BarChart3, Lock } from "lucide-react";

const fa = (n: number) => n.toLocaleString("fa-IR");

/** A Gregorian ISO date reads as foreign inside a Persian sentence — the same
 *  defect as printing "Toronto، ON" on the bio page. The rest of the dashboard
 *  formats dates this way. */
const faDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("fa-IR", { dateStyle: "medium" });

export type SummaryRow = { day: string; event_type: string; value: string; n: number; uniques: number };

const DEVICE_FA: Record<string, string> = { mobile: "موبایل", desktop: "دسکتاپ", tablet: "تبلت" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--bg)] px-4 py-3">
      <div className="text-xs font-bold text-[color:var(--muted-text)]">{label}</div>
      <div className="mt-1 text-xl font-black text-[color:var(--text)]">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[color:var(--muted-text)]">{hint}</div>}
    </div>
  );
}

/**
 * Sum a dimension across the window.
 *
 * `link_page_summary` returns ONE ROW PER DAY per value — it is a daily
 * rollup, not a total. The first version of this component mapped those rows
 * straight into the list, so a link clicked eleven times over the window
 * rendered as "تماس تلفنی ۱" repeated, and the top-6 cut kept six single days
 * instead of the six biggest categories. Every number was wrong and every
 * ranking was arbitrary. Grouping first is not a nicety.
 */
function totalBy(rows: SummaryRow[], eventType: string, label: (value: string) => string) {
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (r.event_type !== eventType) continue;
    const key = label(r.value);
    sums.set(key, (sums.get(key) ?? 0) + r.n);
  }
  return [...sums.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

/** A breakdown list. `total` is passed in so the bars are proportions of the
 *  metric, not of the largest row — otherwise the top row is always full
 *  width and the picture is flattering rather than informative. */
function Breakdown({
  title,
  rows,
  total,
  empty,
}: {
  title: string;
  rows: { label: string; n: number }[];
  total: number;
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-black text-[color:var(--text)]">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-[color:var(--muted-text)]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[color:var(--text)]">{r.label}</span>
                <span className="text-[color:var(--muted-text)]">{fa(r.n)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--line)]">
                <div
                  className="h-full rounded-full bg-[color:var(--annabi)]"
                  style={{ width: total > 0 ? `${Math.round((r.n / total) * 100)}%` : "0%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LinkAnalytics({
  windowDays,
  totals,
  byItem,
  byReferrer,
  byDevice,
  itemLabels,
  pro,
  oldestDay,
}: {
  windowDays: number;
  totals: SummaryRow[];
  byItem: SummaryRow[];
  byReferrer: SummaryRow[];
  byDevice: SummaryRow[];
  itemLabels: Record<string, string>;
  pro: boolean;
  /** Oldest day this page holds any data for, or null when it holds none. */
  oldestDay: string | null;
}) {
  const views = totals.filter((r) => r.event_type === "link_view");
  const clicks = totals.filter((r) => r.event_type === "link_click");
  const viewTotal = views.reduce((s, r) => s + r.n, 0);
  const viewUniques = views.reduce((s, r) => s + r.uniques, 0);
  const clickTotal = clicks.reduce((s, r) => s + r.n, 0);

  // Data older than the window this owner may read. One date decides it; the
  // rows themselves are never fetched.
  const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const hasLockedHistory = !pro && !!oldestDay && oldestDay < windowStart;

  const dayMap = new Map(views.map((r) => [r.day, r.n]));
  const days: { day: string; n: number }[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push({ day: d, n: dayMap.get(d) ?? 0 });
  }
  const peak = Math.max(1, ...days.map((d) => d.n));

  return (
    <section className="rounded-2xl border border-[color:var(--line)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <BarChart3 size={16} className="text-[color:var(--annabi)]" /> آمار
        </h2>
        {/* The window is part of the number, not a caption. */}
        <span className="rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--muted-text)]">
          {fa(windowDays)} روز گذشته
        </span>
      </div>

      {totals.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted-text)]">
          هنوز داده‌ای ثبت نشده. شمارش از وقتی شروع می‌شود که صفحه منتشر باشد و کسی بازش کند — و آمار هر روز
          یک‌بار جمع‌بندی می‌شود، پس بازدید همین چند دقیقه‌ی پیش ممکن است هنوز اینجا نباشد.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="بازدید" value={fa(viewTotal)} />
            <Stat label="بازدیدکننده" value={fa(viewUniques)} hint="روزانه، بدون ردیابی" />
            <Stat label="کلیک روی لینک‌ها" value={fa(clickTotal)} />
          </div>

          <div className="mt-5 flex h-16 items-end gap-[2px]" dir="ltr">
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day} — ${fa(d.n)}`}
                className="flex-1 rounded-t bg-[color:var(--annabi)]/70"
                // A zero day is a real answer, so it keeps a visible sliver
                // rather than vanishing and leaving a hole that reads as a
                // missing measurement.
                style={{ height: `${Math.max(2, Math.round((d.n / peak) * 100))}%` }}
              />
            ))}
          </div>

          {pro && (
            <div className="mt-6 grid gap-5 border-t border-[color:var(--line)] pt-5 md:grid-cols-3">
              <Breakdown
                title="کدام لینک"
                rows={totalBy(byItem, "link_click", (v) => itemLabels[v] ?? "لینک حذف‌شده").slice(0, 6)}
                total={clickTotal}
                empty="هنوز کلیکی ثبت نشده."
              />
              <Breakdown
                title="از کجا آمدند"
                rows={totalBy(byReferrer, "link_view", (v) => v).slice(0, 6)}
                total={viewTotal}
                empty="منبع ورود ثبت نشده — یعنی مستقیم باز شده، مثل وقتی لینک را از بیو کپی می‌کنند."
              />
              <Breakdown
                title="با چه دستگاهی"
                rows={totalBy(byDevice, "link_view", (v) => DEVICE_FA[v] ?? v)}
                total={viewTotal}
                empty="—"
              />
            </div>
          )}
        </>
      )}

      {hasLockedHistory && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-[color:var(--bg)] px-4 py-3">
          <Lock size={14} className="mt-0.5 shrink-0 text-[color:var(--muted-text)]" />
          <p className="text-xs leading-6 text-[color:var(--muted-text)]">
            داده‌ی این صفحه از {faDate(oldestDay!)} ثبت شده، ولی در پلن فعلی فقط {fa(windowDays)} روز اخیر را می‌بینی. با
            «لینک حرفه‌ای» همان تاریخچه‌ی واقعی باز می‌شود، به‌علاوه‌ی اینکه کدام لینک کلیک خورده و بازدیدکننده‌ها
            از کجا آمده‌اند.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Source: app/admin/(dashboard)/health/page.tsx
// Version: 1.0.0 — 2026-08-27
// Why: reportQuietFailure has been writing to system_errors since 26 Aug and
//      nothing has ever read it — the table was reachable only through the
//      backup screen's table list. So when someone writes «اجازه ثبت نمیده و
//      وقتی درخواست کد برای ایمیل میکنم خطا میده», the only available answer
//      was to ask them to try again while someone watched the Vercel log.
//      This page is that log, kept, searchable, and next to the cron
//      heartbeat — because "the job stopped running" and "the job failed"
//      look identical from the outside and neither throws.
// Env / Identity: Server Component, admin/moderator only. Reads through the
//      service role: system_errors and cron_runs have RLS on and no policy.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, HeartPulse, Mail, Timer, UserPlus } from "lucide-react";

import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";
import { NotAuthenticatedError, requireAdmin } from "@/lib/auth/require-admin";
import { tableExists } from "@/lib/admin/table-exists";
import { QUIET_FAILURE_KINDS, type QuietFailure } from "@/lib/observability/report";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "سلامت سیستم | داشبورد ادمین" };
export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");

const when = (v: string) =>
  new Date(v).toLocaleString("fa-IR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Plain Persian for each slug. An unlabelled kind still renders as its slug. */
const KIND_FA: Record<QuietFailure, string> = {
  email_not_configured: "کلید ایمیل تنظیم نشده",
  email_send_failed: "ارسال ایمیل ناموفق",
  sms_not_configured: "پیامک تنظیم نشده",
  sms_send_failed: "ارسال پیامک ناموفق",
  sms_carrier_rejected: "اپراتور پیامک را رد کرد",
  verification_write_failed: "ثبت تاییدیه ناموفق",
  reminder_send_failed: "یادآور احراز ارسال نشد",
  job_reminder_send_failed: "یادآور آگهی استخدام ارسال نشد",
  job_reminder_no_address: "آگهی استخدام بدون ایمیل",
  cron_run_failed: "اجرای زمان‌بندی‌شده ناموفق",
  request_error: "خطای درخواست",
  signup_failed: "ثبت‌نام ناموفق",
  contact_code_failed: "درخواست کد تایید ناموفق",
  exchange_rates_http: "نرخ ارز — خطای HTTP",
  exchange_rates_shape: "نرخ ارز — ساختار غیرمنتظره",
  exchange_rates_fetch_failed: "نرخ ارز — دریافت ناموفق",
  link_rollup_day: "تجمیع آمار لینک",
  link_rollup_backlog: "تجمیع عقب‌افتاده لینک",
  channel_rollup_day: "تجمیع آمار کانال",
  link_prune: "پاک‌سازی لینک",
};

/** The two kinds a person actually complains about, pinned to the top. */
const COMPLAINT_KINDS: { kind: QuietFailure; label: string; Icon: typeof Mail }[] = [
  { kind: "signup_failed", label: "ثبت‌نام ناموفق", Icon: UserPlus },
  { kind: "contact_code_failed", label: "درخواست کد تایید ناموفق", Icon: Mail },
];

const WINDOWS = [
  { days: 1, label: "۲۴ ساعت" },
  { days: 7, label: "۷ روز" },
  { days: 30, label: "۳۰ روز" },
];

const label = (k: string) => KIND_FA[k as QuietFailure] ?? k;

export default async function SystemHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; days?: string }>;
}) {
  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase);
  } catch (e) {
    redirect(e instanceof NotAuthenticatedError ? "/admin/login" : "/auth/login?error=unauthorized");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const days = WINDOWS.some((w) => w.days === Number(sp.days)) ? Number(sp.days) : 7;
  const kind = sp.kind && QUIET_FAILURE_KINDS.includes(sp.kind as QuietFailure) ? sp.kind : undefined;

  const admin = createSupabaseAdminClient();

  if (!(await tableExists(admin, "system_errors"))) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-[color:var(--text)]">سلامت سیستم</h1>
        <p className="rounded-xl border border-red-300 bg-red-50/40 p-4 text-sm font-bold text-red-700">
          جدول system_errors پاسخ نمی‌دهد — مایگریشن 20260826090000_system_errors هنوز در
          SQL Editor اجرا نشده. تا اجرا نشود هیچ خطایی ثبت نمی‌شود و این صفحه چیزی برای
          نشان دادن ندارد.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  // Counted per kind rather than aggregated from a fetched page: an unbounded
  // select is capped at 1,000 rows by PostgREST without saying so, and a
  // breakdown built on a silently truncated list is worse than none.
  const countOf = async (k: string) =>
    (
      await admin
        .from("system_errors")
        .select("id", { count: "exact", head: true })
        .eq("kind", k)
        .gte("created_at", since)
    ).count ?? 0;

  const [counts, rowsResult, cronRuns] = await Promise.all([
    Promise.all(QUIET_FAILURE_KINDS.map(async (k) => [k, await countOf(k)] as const)),
    (async () => {
      let q = admin
        .from("system_errors")
        .select("id, kind, detail, environment, created_at", { count: "exact" })
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
      if (kind) q = q.eq("kind", kind);
      return q;
    })(),
    (await tableExists(admin, "cron_runs"))
      ? admin
          .from("cron_runs")
          .select("job, status, created_at, duration_ms")
          .order("created_at", { ascending: false })
          .limit(60)
      : { data: null },
  ]);

  const byKind = new Map(counts);
  const present = counts.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = counts.reduce((s, [, n]) => s + n, 0);
  const rows = rowsResult.data ?? [];
  const rowsTotal = rowsResult.count ?? 0;

  // Newest run per job. The number that matters is how long ago, not the list:
  // a job that stopped firing writes nothing at all, so its silence is only
  // legible as a timestamp drifting backwards.
  const lastRun = new Map<string, { status: string; created_at: string }>();
  for (const r of (cronRuns.data ?? []) as { job: string; status: string; created_at: string }[]) {
    if (!lastRun.has(r.job)) lastRun.set(r.job, { status: r.status, created_at: r.created_at });
  }

  const href = (next: { kind?: string; days?: number }) => {
    const q = new URLSearchParams();
    const k = "kind" in next ? next.kind : kind;
    const d = next.days ?? days;
    if (k) q.set("kind", k);
    if (d !== 7) q.set("days", String(d));
    const s = q.toString();
    return s ? `/admin/health?${s}` : "/admin/health";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-extrabold text-[color:var(--text)]">
          <HeartPulse className="text-[color:var(--lajvard)]" size={26} />
          سلامت سیستم
        </h1>
        <p className="text-[color:var(--muted-text)]">
          خطاهایی که کاربر می‌بیند ولی هیچ‌جا صدا نمی‌کنند: ثبت‌نام ناموفق، درخواست کد تایید،
          ارسال ایمیل و پیامک. اگر کسی پیام داد «اجازه ثبت نمی‌دهد» یا «کد ایمیل خطا می‌دهد»،
          پاسخش اینجاست.
        </p>
      </div>

      {/* The two complaint kinds, always shown — including at zero, because
          "هیچ خطایی ثبت نشده" is itself an answer. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COMPLAINT_KINDS.map(({ kind: k, label: l, Icon }) => (
          <Link
            key={k}
            href={href({ kind: k })}
            className={`rounded-xl border p-4 transition hover:shadow-sm ${
              (byKind.get(k) ?? 0) > 0
                ? "border-red-200 bg-red-50/40"
                : "border-[color:var(--line)] bg-card"
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted-text)]">
              <Icon size={16} />
              {l}
            </div>
            <strong className="mt-2 block text-2xl font-black text-[color:var(--text)]">
              {fa(byKind.get(k) ?? 0)}
            </strong>
          </Link>
        ))}
        <div className="rounded-xl border border-[color:var(--line)] bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted-text)]">
            <AlertTriangle size={16} />
            مجموع خطاها
          </div>
          <strong className="mt-2 block text-2xl font-black text-[color:var(--text)]">{fa(total)}</strong>
        </div>
      </div>

      {/* Window + kind filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--muted-text)]">بازه:</span>
        {WINDOWS.map((w) => (
          <Link
            key={w.days}
            href={href({ days: w.days })}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
              w.days === days
                ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
                : "border-[color:var(--line)] bg-white text-[color:var(--text)] hover:bg-gray-50"
            }`}
          >
            {w.label}
          </Link>
        ))}
        {kind && (
          <Link
            href={href({ kind: undefined })}
            className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-bold text-[color:var(--text)] hover:bg-gray-50"
          >
            حذف فیلتر «{label(kind)}» ✕
          </Link>
        )}
      </div>

      {/* Breakdown */}
      {present.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {present.map(([k, n]) => (
            <Link
              key={k}
              href={href({ kind: k })}
              className={`rounded-lg border px-3 py-1.5 text-xs transition hover:bg-gray-50 ${
                k === kind ? "border-[color:var(--lajvard)] font-bold" : "border-[color:var(--line)]"
              }`}
            >
              {label(k)} <span className="text-[color:var(--muted-text)]">({fa(n)})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Rows */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--line)] bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/80 font-medium text-muted-foreground">
              <tr>
                <th className="p-3">زمان</th>
                <th className="p-3">نوع</th>
                <th className="p-3">جزئیات</th>
                <th className="p-3">محیط</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    در این بازه خطایی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                rows.map((r: any) => (
                  <tr key={r.id} className="align-top hover:bg-accent/30">
                    <td className="whitespace-nowrap p-3 text-muted-foreground">{when(r.created_at)}</td>
                    <td className="p-3 font-semibold">{label(r.kind)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(r.detail ?? {}).map(([k, v]) => (
                          <span key={k} className="text-xs">
                            <span className="text-muted-foreground">{k}: </span>
                            <span dir="ltr" className="break-all">{String(v)}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{r.environment ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          total={rowsTotal}
          basePath="/admin/health"
          params={{ kind, days: days === 7 ? undefined : String(days) }}
          itemLabel="خطا"
        />
      </div>

      {/* Cron heartbeat */}
      <div className="rounded-xl border border-[color:var(--line)] bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Activity size={18} className="text-[color:var(--lajvard)]" />
          آخرین اجرای کارهای زمان‌بندی‌شده
        </h2>
        <p className="mb-3 text-xs text-[color:var(--muted-text)]">
          کاری که اصلاً اجرا نشود هیچ خطایی نمی‌نویسد؛ نشانه‌اش فقط قدیمی‌شدن همین تاریخ است.
        </p>
        {lastRun.size === 0 ? (
          <p className="text-sm text-[color:var(--muted-text)]">هیچ اجرایی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-[color:var(--line)] text-sm">
            {[...lastRun.entries()].map(([job, r]) => (
              <li key={job} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 font-medium" dir="ltr">
                  <Timer size={14} className="text-[color:var(--muted-text)]" />
                  {job}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      r.status === "ok"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {r.status === "ok" ? "موفق" : "ناموفق"}
                  </span>
                  <span className="text-xs text-[color:var(--muted-text)]">{when(r.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

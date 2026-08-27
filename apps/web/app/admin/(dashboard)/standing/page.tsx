// ============================================================================
// Source: app/admin/(dashboard)/standing/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The owner's surface for «اعتبار مشارکت» (docs/16). Follows the settings
//      page's habit of probing rather than assuming: migrations here are
//      applied by pasting into the SQL Editor, so "did it run?" is a real
//      question that belongs on screen — this page renders red probes, not a
//      crash, while 20260830420000 is unapplied.
//
//      Split by the spec's three colours: the green knobs (rules-editor) are
//      freely editable because settlement freezes points; the amber actions
//      (user-actions) demand a typed reason and are logged; the red list
//      (new kinds, low-risk fields, history) is deliberately absent.
// Env / Identity: Admin-only. The layout gates the section, but this page
//      re-checks on its own: App Router renders page and layout in parallel,
//      and this page's queries fail fast while the tables are unapplied, so
//      its HTML can finish streaming before the layout's redirect lands — an
//      unauthenticated curl was able to read the probe section. Counts and
//      point values are not PII, but an admin page that leaks anything at
//      all is the wrong precedent. Both API routes also requireAdmin.
// ============================================================================
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, ListChecks, Scale, Users } from "lucide-react";

import { LEVEL_LABELS_FA, levelFor, type StandingAggregates, type StandingLevel } from "@goplaza/core";

import { NotAuthenticatedError, requireAdmin } from "@/lib/auth/require-admin";
import { tableExists } from "@/lib/admin/table-exists";
import { getRules, getStandingSettings } from "@/lib/standing/rules";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { daysAgoIso, hoursAgoIso } from "@/lib/time";
import { RulesEditor } from "./rules-editor";
import { UserActions } from "./user-actions";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = {
  title: "اعتبار مشارکت | داشبورد ادمین",
};
export const dynamic = "force-dynamic";


/** Probes + live counts. Errors read as a red probe / zero, never a crash. */
async function loadStatus() {
  const admin = createSupabaseAdminClient();
  const dayAgo = hoursAgoIso(24);
  const monthAgo = daysAgoIso(30);

  // tableExists, not a HEAD probe: a HEAD request for a missing table returns
  // 204/null/no-error, so `!error` renders GREEN for a table that is not
  // there. See lib/admin/table-exists.ts — this was live here until 26 Aug.
  const applied = (
    await Promise.all(
      ["standing_events", "standing_rules", "user_standing"].map((t) => tableExists(admin, t))
    )
  ).every(Boolean);

  if (!applied) {
    return { applied, pending: 0, settledToday: 0, reversed30: 0, settled30: 0, levels: [0, 0, 0, 0] };
  }

  const [{ count: pending }, { count: settledToday }, { count: reversed30 }, { count: settled30 }] =
    await Promise.all([
      admin.from("standing_events").select("id", { head: true, count: "exact" }).eq("state", "pending"),
      admin.from("standing_events").select("id", { head: true, count: "exact" }).eq("state", "confirmed").gt("settled_at", dayAgo),
      admin.from("standing_events").select("id", { head: true, count: "exact" }).eq("state", "reversed").gt("settled_at", monthAgo),
      admin.from("standing_events").select("id", { head: true, count: "exact" }).in("state", ["confirmed", "reversed"]).gt("settled_at", monthAgo),
    ]);

  // Users per level, judged in TS the same way every consumer judges — the
  // page must never grow its own SQL ladder. Fine at this scale; the day
  // this table outgrows one fetch, aggregate counts, not the judgement,
  // move to SQL.
  const settings = await getStandingSettings();
  const { data: rows } = await admin
    .from("user_standing")
    .select("xp, confirmed_count, reversed_count, distinct_kinds, accuracy, last_confirmed_at, peak_level, level_grant, frozen")
    .limit(1000);
  const levels = [0, 0, 0, 0];
  for (const r of rows ?? []) {
    const agg: StandingAggregates = { ...r, accuracy: r.accuracy == null ? null : Number(r.accuracy) } as StandingAggregates;
    levels[levelFor(agg, settings.thresholds, new Date(), settings.maintenance_window_days)]++;
  }

  return {
    applied,
    pending: pending ?? 0,
    settledToday: settledToday ?? 0,
    reversed30: reversed30 ?? 0,
    settled30: settled30 ?? 0,
    levels,
  };
}

export default async function StandingAdminPage() {
  // Own gate first — see the header. Same redirect targets as the layout.
  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase);
  } catch (e) {
    redirect(e instanceof NotAuthenticatedError ? "/admin/login" : "/auth/login?error=unauthorized");
  }

  const [settings, rules, status] = await Promise.all([
    getStandingSettings(),
    getRules(),
    loadStatus(),
  ]);

  const probes = [
    { name: "جدول‌های standing (مایگریشن 20260830420000)", ok: status.applied },
    { name: "قواعد امتیازدهی (۶ ردیف seed)", ok: rules.length > 0 },
  ];
  const reversalRate =
    status.settled30 > 0 ? Math.round((status.reversed30 / status.settled30) * 100) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-black text-[color:var(--text)]">
          <Award size={20} /> اعتبار مشارکت
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted-text)]">
          دفترکل مشارکت‌ها: امتیاز در لحظه‌ی تسویه منجمد می‌شود، پس تغییر این
          اعداد فقط تسویه‌های آینده را عوض می‌کند — تاریخِ هیچ‌کس بازنویسی
          نمی‌شود.
        </p>
      </header>

      {/* Probes — red rows, not assumptions. */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <ListChecks size={16} /> زیرساخت
        </h2>
        <ul className="space-y-1 text-sm">
          {probes.map((p) => (
            <li key={p.name} className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.ok ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className={p.ok ? "text-[color:var(--text)]" : "font-bold text-red-600"}>{p.name}</span>
              {!p.ok && <span className="text-xs text-[color:var(--muted-text)]">— در SQL Editor اجرا شود</span>}
            </li>
          ))}
        </ul>
      </section>

      {status.applied && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "رویداد در انتظار", value: fa(status.pending) },
            { label: "تسویه‌ی امروز", value: fa(status.settledToday) },
            {
              label: "نرخ بازپس‌گیری (۳۰ روز)",
              value: reversalRate == null ? "—" : `${fa(reversalRate)}٪`,
            },
            {
              label: "کاربران هر سطح",
              value: ([1, 2, 3] as StandingLevel[])
                .map((l) => `${LEVEL_LABELS_FA[l]} ${fa(status.levels[l])}`)
                .join(" · "),
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
              <div className="text-xs text-[color:var(--muted-text)]">{s.label}</div>
              <div className="mt-1 text-sm font-black text-[color:var(--text)]">{s.value}</div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <Scale size={16} /> قواعد و آستانه‌ها
        </h2>
        <RulesEditor settings={settings} rules={rules} />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
          <Users size={16} /> اقدام روی کاربر و رویداد
        </h2>
        <UserActions />
      </section>
    </div>
  );
}

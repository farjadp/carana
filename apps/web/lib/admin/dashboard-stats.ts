// ============================================================================
// Source: lib/admin/dashboard-stats.ts
// Version: 1.0.0 — 2026-11-13
// Why: The admin home showed three counts and a hard-coded date. This module
//      is every number the new home shows, each from a query against
//      production — nothing typed in, nothing estimated.
//
//      Rules this file keeps:
//      · A section that fails returns { ok: false } and the tile says so. A
//        failed query never renders as 0, because 0 is a claim.
//      · Counts are exact head counts; row reads go through fetchAllRows, so
//        the PostgREST 1,000-row cap cannot silently truncate a series.
//      · Paid state is never read from `businesses.plan` alone: entitlement
//        comes from plan_until, and MRR comes only from Stripe-written
//        subscription rows (the webhook is the only writer of paid state).
//        A paid plan with no subscription behind it is counted separately,
//        as granted, not as revenue.
//      · "Today" and "this month" are Toronto days — the business runs on
//        Eastern time, and UTC midnight would move a 20:00 sign-up into
//        tomorrow.
// Env / Identity: Server only. Service-role client: several of these tables
//      (search_queries, system_errors, subscriptions) have RLS with no
//      admin policy. Callers must have passed requireAdmin first.
// ============================================================================
import "server-only";

import {
  INTERVAL_MONTHS,
  LINK_PRO_PRICE,
  PAID_PLANS,
  PLANS,
  PUBLIC_STATUSES,
  type BillingInterval,
  type PlanId,
} from "@goplaza/core";

import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { topSearches } from "@/lib/search";
import { daysAgoIso, hoursAgoIso } from "@/lib/time";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export type DayPoint = { day: string; n: number };

const TZ = "America/Toronto";
const TREND_DAYS = 30;

// ---------------------------------------------------------------------------
// Toronto calendar helpers
// ---------------------------------------------------------------------------

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD of `d` as a Toronto calendar day. */
export const torontoDay = (d: Date | string): string => dayKeyFmt.format(new Date(d));

/** "GMT-05:00" → "-05:00" for the given instant in Toronto. */
function torontoOffset(at: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : "+00:00";
}

/** ISO instant of Toronto midnight on `day` (YYYY-MM-DD). */
function torontoMidnightIso(day: string): string {
  const guess = new Date(`${day}T12:00:00Z`);
  return new Date(`${day}T00:00:00${torontoOffset(guess)}`).toISOString();
}

function windows(now = new Date()) {
  const today = torontoDay(now);
  const monthStart = `${today.slice(0, 8)}01`;
  const days: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    days.push(torontoDay(new Date(now.getTime() - i * 86_400_000)));
  }
  return {
    todayIso: torontoMidnightIso(today),
    monthIso: torontoMidnightIso(monthStart),
    trendStartIso: torontoMidnightIso(days[0]),
    days,
  };
}

function bucket(days: string[], stamps: (string | null | undefined)[]): DayPoint[] {
  const counts = new Map(days.map((d) => [d, 0]));
  for (const s of stamps) {
    if (!s) continue;
    const k = torontoDay(s);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return days.map((day) => ({ day, n: counts.get(day) ?? 0 }));
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
    console.error(`admin dashboard: ${label}:`, e);
    return { ok: false, error: msg };
  }
}

/** Exact head count. Throws on error so `safe` can mark the section failed. */
async function count(q: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type BusinessStats = {
  listed: number;
  drafts: number;
  new7d: number;
  new30d: number;
  claimed: number;
  unclaimed: number;
  trend: DayPoint[];
};

async function businessStats(db: Admin, w: ReturnType<typeof windows>): Promise<BusinessStats> {
  const b = () => db.from("businesses").select("id", { count: "exact", head: true });
  const [listed, drafts, new7d, new30d, claimed, recent] = await Promise.all([
    count(b().in("status", PUBLIC_STATUSES)),
    count(b().eq("status", "DRAFT")),
    count(b().gte("created_at", daysAgoIso(7))),
    count(b().gte("created_at", daysAgoIso(30))),
    count(b().in("status", PUBLIC_STATUSES).not("owner_user_id", "is", null)),
    fetchAllRows<{ created_at: string }>(() =>
      db.from("businesses").select("created_at").gte("created_at", w.trendStartIso).order("id")
    ),
  ]);
  return {
    listed,
    drafts,
    new7d,
    new30d,
    claimed,
    unclaimed: listed - claimed,
    trend: bucket(w.days, recent.map((r) => r.created_at)),
  };
}

export type UserStats = {
  total: number;
  today: number;
  d7: number;
  d30: number;
  active30: number;
  trend: DayPoint[];
};

/**
 * From auth.users, not profiles: the two disagree (41 vs 37 on 13 Nov) and
 * auth is where a sign-up and a sign-in actually happen. "Active" is a
 * sign-in in the last 30 days — the only activity signal auth records.
 */
async function userStats(db: Admin, w: ReturnType<typeof windows>): Promise<UserStats> {
  const users: { created_at: string; last_sign_in_at?: string | null }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const since = (iso: string) => users.filter((u) => u.created_at >= iso).length;
  const d30Iso = daysAgoIso(30);
  return {
    total: users.length,
    today: since(w.todayIso),
    d7: since(daysAgoIso(7)),
    d30: since(d30Iso),
    active30: users.filter((u) => (u.last_sign_in_at ?? "") >= d30Iso).length,
    trend: bucket(w.days, users.map((u) => u.created_at)),
  };
}

export type RevenueStats = {
  /** Cents CAD per month, from active Stripe subscription rows only. */
  mrrCents: number;
  activeSubs: number;
  subsByPlan: { key: string; n: number }[];
  newThisMonth: number;
  cancelledThisMonth: number;
  /** Cents CAD actually paid this Toronto month, from Stripe invoices. */
  paidThisMonthCents: number;
  /** Businesses whose plan is in force (plan_until in the future), by plan. */
  entitledByPlan: { plan: PlanId; n: number }[];
  /** Of those, how many have no active Stripe subscription — granted, not sold. */
  entitledWithoutSub: number;
};

function monthlyCents(plan: string, interval: string | null, product: string | null): number {
  if (product === "link_pro") {
    if (interval === "month") return LINK_PRO_PRICE.month;
    if (interval === "year") return Math.round(LINK_PRO_PRICE.year / 12);
    return 0;
  }
  const p = PLANS[plan as PlanId];
  const i = interval as BillingInterval | null;
  if (!p || !i || !(i in INTERVAL_MONTHS)) return 0;
  const price = p.price[i];
  return price ? Math.round(price / INTERVAL_MONTHS[i]) : 0;
}

async function revenueStats(db: Admin, w: ReturnType<typeof windows>): Promise<RevenueStats> {
  const nowIso = new Date().toISOString();
  const [subs, entitled, invoices] = await Promise.all([
    fetchAllRows<{
      business_id: string | null;
      plan: string;
      status: string;
      interval: string | null;
      product: string | null;
      created_at: string;
      canceled_at: string | null;
    }>(() =>
      db
        .from("subscriptions")
        .select("business_id, plan, status, interval, product, created_at, canceled_at")
        .order("id")
    ),
    fetchAllRows<{ id: string; plan: string }>(() =>
      db.from("businesses").select("id, plan").in("plan", PAID_PLANS).gt("plan_until", nowIso).order("id")
    ),
    fetchAllRows<{ amount_paid: number | null; currency: string | null }>(() =>
      db.from("invoices").select("amount_paid, currency").eq("status", "paid").gte("paid_at", w.monthIso).order("id")
    ),
  ]);

  // "active" is the only status that is money arriving. trialing has not
  // paid; past_due has stopped paying until Stripe's retries say otherwise.
  const active = subs.filter((s) => s.status === "active");
  const byPlan = new Map<string, number>();
  for (const s of active) {
    const key = s.product === "link_pro" ? "link_pro" : s.plan;
    byPlan.set(key, (byPlan.get(key) ?? 0) + 1);
  }

  const subbedBusinesses = new Set(active.map((s) => s.business_id).filter(Boolean));
  const entitledCount = new Map<PlanId, number>();
  for (const b of entitled) entitledCount.set(b.plan as PlanId, (entitledCount.get(b.plan as PlanId) ?? 0) + 1);

  return {
    mrrCents: active.reduce((sum, s) => sum + monthlyCents(s.plan, s.interval, s.product), 0),
    activeSubs: active.length,
    subsByPlan: [...byPlan].map(([key, n]) => ({ key, n })),
    newThisMonth: subs.filter((s) => s.created_at >= w.monthIso).length,
    cancelledThisMonth: subs.filter((s) => (s.canceled_at ?? "") >= w.monthIso).length,
    paidThisMonthCents: invoices
      .filter((i) => (i.currency ?? "cad").toLowerCase() === "cad")
      .reduce((sum, i) => sum + (i.amount_paid ?? 0), 0),
    entitledByPlan: PAID_PLANS.map((plan) => ({ plan, n: entitledCount.get(plan) ?? 0 })),
    entitledWithoutSub: entitled.filter((b) => !subbedBusinesses.has(b.id)).length,
  };
}

export type QueueStats = {
  claims: number;
  reviews: number;
  reports: number;
  jobs: number;
  channels: number;
  suggestions: number;
  blogReview: number;
  errors24h: number;
};

/** Same filters as the sidebar badges in layout.tsx, so the two never disagree. */
async function queueStats(db: Admin): Promise<QueueStats> {
  const c = (table: string, col: string, val: string) =>
    count(db.from(table).select("id", { count: "exact", head: true }).eq(col, val));
  const [claims, reviews, reports, jobs, channels, suggestions, blogReview, errors24h] = await Promise.all([
    c("business_claims", "status", "pending"),
    c("public_reviews", "status", "pending_moderation"),
    c("business_reports", "status", "new"),
    c("job_posts", "status", "pending_moderation"),
    c("channels", "status", "pending_moderation"),
    c("suggestions", "status", "new"),
    c("blog_posts", "status", "review"),
    count(db.from("system_errors").select("id", { count: "exact", head: true }).gte("created_at", hoursAgoIso(24))),
  ]);
  return { claims, reviews, reports, jobs, channels, suggestions, blogReview, errors24h };
}

export type BlogRun = {
  startedAt: string;
  finishedAt: string | null;
  requested: number | null;
  created: number | null;
  notes: string | null;
  error: string | null;
};

export type ContentStats = {
  published7d: number;
  published30d: number;
  publishedTotal: number;
  lastRun: BlogRun | null;
  lastFailedRun: BlogRun | null;
  snippetsSent7d: number;
  snippetsFailed: number;
  lastSnippetError: string | null;
};

function firstError(errors: unknown): string | null {
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const e = errors[0] as { error?: unknown } | string;
  const text = typeof e === "string" ? e : typeof e?.error === "string" ? e.error : JSON.stringify(e);
  return text.slice(0, 280);
}

function toRun(r: {
  started_at: string;
  finished_at: string | null;
  requested: number | null;
  created: number | null;
  notes: string | null;
  errors: unknown;
}): BlogRun {
  return {
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    requested: r.requested,
    created: r.created,
    notes: r.notes,
    error: firstError(r.errors),
  };
}

async function contentStats(db: Admin): Promise<ContentStats> {
  const pub = () => db.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published");
  const [published7d, published30d, publishedTotal, runs, snippetsSent7d, snippetsFailed, lastSnip] = await Promise.all([
    count(pub().gte("published_at", daysAgoIso(7))),
    count(pub().gte("published_at", daysAgoIso(30))),
    count(pub()),
    // 60 runs is two months at the old rate; enough to find the last failure.
    db
      .from("blog_runs")
      .select("started_at, finished_at, requested, created, notes, errors")
      .order("started_at", { ascending: false })
      .limit(60),
    count(
      db.from("blog_snippets").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", daysAgoIso(7))
    ),
    count(db.from("blog_snippets").select("id", { count: "exact", head: true }).eq("status", "failed")),
    db
      .from("blog_snippets")
      .select("error")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (runs.error) throw new Error(runs.error.message);
  if (lastSnip.error) throw new Error(lastSnip.error.message);

  const all = (runs.data ?? []).map(toRun);
  // A run failed when it recorded an error, or made fewer articles than asked
  // for without one (a crash between the two writes leaves exactly that).
  const failed = all.find((r) => r.error || (r.finishedAt && (r.created ?? 0) < (r.requested ?? 0) && (r.created ?? 0) === 0));

  return {
    published7d,
    published30d,
    publishedTotal,
    lastRun: all[0] ?? null,
    lastFailedRun: failed ?? null,
    snippetsSent7d,
    snippetsFailed,
    lastSnippetError: lastSnip.data?.[0]?.error ?? null,
  };
}

export type SearchStats = {
  /** Typed searches only (source = web) — chip clicks and AI expansions are ours, not demand. */
  typed30d: number;
  zeroResult30d: number;
  top: { term: string; hits: number }[] | null;
  trend: DayPoint[];
};

async function searchStats(db: Admin, w: ReturnType<typeof windows>): Promise<SearchStats> {
  const [rows, top] = await Promise.all([
    fetchAllRows<{ created_at: string; result_count: number | null }>(() =>
      db
        .from("search_queries")
        .select("created_at, result_count")
        .eq("source", "web")
        .gte("created_at", w.trendStartIso)
        .order("id")
    ),
    // Same aggregate the home hero reads (web rows only), over 30 days.
    topSearches(db, 10, 30),
  ]);
  return {
    typed30d: rows.length,
    zeroResult30d: rows.filter((r) => r.result_count === 0).length,
    top,
    trend: bucket(w.days, rows.map((r) => r.created_at)),
  };
}

export type AiStats = { callsThisMonth: number; byFeature: { feature: string; n: number }[] };

/**
 * ai_usage counts calls, one row per request. Its `tokens` column is never
 * written, so this is a call count, not a dollar figure — and only the
 * user-facing endpoints write it (today: the job-description writer). The
 * blog pipeline's model calls are not in this table.
 */
async function aiStats(db: Admin, w: ReturnType<typeof windows>): Promise<AiStats> {
  const rows = await fetchAllRows<{ feature: string }>(() =>
    db.from("ai_usage").select("feature").gte("created_at", w.monthIso).order("id")
  );
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.feature, (m.get(r.feature) ?? 0) + 1);
  return { callsThisMonth: rows.length, byFeature: [...m].map(([feature, n]) => ({ feature, n })) };
}

// ---------------------------------------------------------------------------

export type DashboardStats = {
  generatedAt: string;
  days: string[];
  businesses: Section<BusinessStats>;
  users: Section<UserStats>;
  revenue: Section<RevenueStats>;
  queues: Section<QueueStats>;
  content: Section<ContentStats>;
  search: Section<SearchStats>;
  ai: Section<AiStats>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = createSupabaseAdminClient();
  const w = windows();
  const [businesses, users, revenue, queues, content, search, ai] = await Promise.all([
    safe("businesses", () => businessStats(db, w)),
    safe("users", () => userStats(db, w)),
    safe("revenue", () => revenueStats(db, w)),
    safe("queues", () => queueStats(db)),
    safe("content", () => contentStats(db)),
    safe("search", () => searchStats(db, w)),
    safe("ai", () => aiStats(db, w)),
  ]);
  return { generatedAt: new Date().toISOString(), days: w.days, businesses, users, revenue, queues, content, search, ai };
}

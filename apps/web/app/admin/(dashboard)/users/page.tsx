// ============================================================================
// Source: app/admin/(dashboard)/users/page.tsx
// Version: 2.0.0 — 2026-08-26 (four more columns, each counted)
// Why: Fetch actual profiles from Supabase on the server and render the client
//      list. Paged because an unbounded select is capped at 1,000 rows by
//      PostgREST with no error — harmless at 8 profiles, silent data loss at
//      1,001.
//
//      v2 adds last activity, standing, the raw UID and money paid. All four
//      are aggregated HERE, for the fifty rows on this page only, in four
//      bounded queries — not per row, which at fifty users would be two
//      hundred round trips.
//
//      WHAT EACH ONE IS, AND WHAT IT IS NOT:
//
//      · Last activity is the newest `user_activity_logs` row, and it shows
//        WHICH action. It is not "last login" — a login is one of the actions
//        logged, and calling the column «آخرین ورود» while it can show a
//        profile edit would be a label that lies about its own number.
//      · Standing is `user_standing.xp` and the level `levelFor()` computes
//        from it. A user with no row genuinely has none: zero and تازه‌وارد
//        are that user's real state, not a placeholder.
//      · Money is the sum of PAID invoices against businesses this person
//        owns — `owner_user_id`, never `created_by`, because the imports
//        account is created_by on 10,600+ scraped listings and nobody paid
//        for a listing they never claimed. **It is not a credit balance.**
//        There is no wallet, no ledger and no stored balance anywhere in this
//        schema, so the column is labelled «پرداخت‌شده» rather than «اعتبار»
//        — see the note in docs/05-open-tasks.md.
// Env / Identity: Admin-only; the layout gates the route, and every query
//      here runs through the request client under that session.
// ============================================================================
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/session";
import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";
import { levelFor, type StandingAggregates } from "@goplaza/core";

import { UserListClient, type ProfileUser } from "./user-list-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const currentUser = await getOptionalUser();
  const supabase = await createSupabaseServerClient();

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data: profiles, count } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  const rows = profiles ?? [];
  const ids = rows.map((p) => p.id as string);

  // Everything below is scoped to the ids on this page. An empty page must not
  // turn `in.()` into a query for the whole table.
  const [activity, standing, owned] = ids.length
    ? await Promise.all([
        supabase
          .from("user_activity_logs")
          .select("user_id, action, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("user_standing")
          .select("user_id, xp, confirmed_count, reversed_count, distinct_kinds, accuracy, last_confirmed_at, peak_level, level_grant, frozen")
          .in("user_id", ids),
        // owner_user_id ONLY, and this is the ownership-model rule rather
        // than a shortcut. `created_by` is not ownership: the imports account
        // is created_by on 10,600+ scraped listings, so widening this to an
        // .or() returns essentially the whole table — verified, it comes back
        // 10,683 — which then hits PostgREST's silent 1,000-row cap and
        // computes the money column from an arbitrary thousand of them. No
        // error, a plausible number, and wrong. Nobody paid for a listing
        // they never claimed, so payment can only follow owner_user_id.
        supabase.from("businesses").select("id, owner_user_id").in("owner_user_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  // Ordered newest-first, so the first row seen for a user is their latest.
  const lastActivity = new Map<string, { action: string; at: string }>();
  for (const row of (activity.data ?? []) as { user_id: string; action: string; created_at: string }[]) {
    if (!lastActivity.has(row.user_id)) {
      lastActivity.set(row.user_id, { action: row.action, at: row.created_at });
    }
  }

  const standingByUser = new Map<string, StandingAggregates>();
  for (const s of (standing.data ?? []) as (StandingAggregates & { user_id: string })[]) {
    standingByUser.set(s.user_id, s);
  }

  // business → owner, so an invoice sum lands on the right person exactly
  // once even when one person owns several listings.
  const businessOwner = new Map<string, string>();
  for (const b of (owned.data ?? []) as { id: string; owner_user_id: string | null }[]) {
    if (b.owner_user_id) businessOwner.set(b.id, b.owner_user_id);
  }

  const paidByUser = new Map<string, { cents: number; currency: string }>();
  if (businessOwner.size > 0) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("business_id, amount_paid, currency, status")
      .in("business_id", [...businessOwner.keys()]);
    for (const inv of invoices ?? []) {
      // Same rule the loyalty tenure calculation uses: an unpaid or void
      // invoice is not money received.
      const paid = inv.status === "paid" || (inv.amount_paid ?? 0) > 0;
      if (!paid) continue;
      const who = businessOwner.get(inv.business_id as string);
      if (!who) continue;
      const prev = paidByUser.get(who) ?? { cents: 0, currency: (inv.currency as string) || "cad" };
      paidByUser.set(who, { cents: prev.cents + (inv.amount_paid ?? 0), currency: prev.currency });
    }
  }

  const users: ProfileUser[] = rows.map((p) => {
    const s = standingByUser.get(p.id as string);
    const last = lastActivity.get(p.id as string) ?? null;
    const money = paidByUser.get(p.id as string) ?? null;
    return {
      id: p.id as string,
      email: p.email as string | null,
      full_name: p.full_name as string | null,
      role: p.role as string | null,
      created_at: p.created_at as string | undefined,
      updated_at: p.updated_at as string | undefined,
      lastActivityAt: last?.at ?? null,
      lastActivityAction: last?.action ?? null,
      xp: s?.xp ?? 0,
      // levelFor() is the only thing that turns aggregates into a level —
      // never `xp >= n` at a call site. A missing row is a real level 0.
      level: s ? levelFor(s) : 0,
      standingFrozen: s?.frozen ?? false,
      paidCents: money?.cents ?? 0,
      paidCurrency: money?.currency ?? "cad",
    };
  });

  return (
    <>
      <UserListClient initialUsers={users} currentUserId={currentUser?.id ?? ""} />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={count ?? 0} basePath="/admin/users" itemLabel="کاربر" />
      </div>
    </>
  );
}

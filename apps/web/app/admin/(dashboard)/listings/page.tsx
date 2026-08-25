// ============================================================================
// Source: app/admin/(dashboard)/listings/page.tsx
// Version: 2.0.0 — 2026-08-25 (server-side paging, search and status filter)
// Why: Admin business listings management page.
//
//      v1 selected every business with no `.range()` and filtered in the
//      browser. With 10,683 rows that failed twice over: PostgREST caps an
//      unbounded select at 1,000 rows *with no error*, so the admin was
//      moderating a 1,000-row slice and had no way to tell; and the whole
//      slice was serialised into the client bundle on every load.
//
//      Paging, searching and filtering are now all server-side, so the page
//      reads exactly the 50 rows it shows and reports the true total. The
//      same 1,000-row cap has now been found in the sitemap (18 Aug), the
//      mobile hero (24 Aug), rehost-logos (24 Aug) and here — assume any
//      `.select()` without `.range()` is a landmine.
// Env / Identity: Server Component. Admin-gated by the (dashboard) layout.
// ============================================================================
import { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";
import ListingsClient from "./listings-client";

export const metadata: Metadata = {
  title: "مدیریت کسب‌وکارها | داشبورد ادمین",
};

const STATUSES = ["DRAFT", "SUBMITTED", "NEEDS_CHANGES", "APPROVED", "PUBLISHED", "REJECTED"];

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();
  const status = STATUSES.includes(sp.status ?? "") ? sp.status! : "";

  const supabase = await createSupabaseServerClient();

  const safeQ = q.replace(/[%,()]/g, " ").trim();
  let ownerIds: string[] = [];
  if (safeQ.includes("@")) {
    const { data: owners } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", `%${safeQ}%`)
      .limit(200);
    ownerIds = (owners ?? []).map((o) => o.id as string);
  }

  // Build the filter twice: once to count, once to fetch. Counting first is
  // what makes the range safe — PostgREST answers PGRST103 "Requested range
  // not satisfiable" when the offset is past the last row, which a stale
  // bookmark or a filter that shrank the result set produces easily, and the
  // page used to render that as a red failure box instead of an empty page.
  const applyFilters = <T,>(qb: T): T => {
    let out = qb as any;
    if (status) out = out.eq("status", status);
    if (q) {
      // Search kept its old reach — name, English name, and the owner's email.
      // The email lives on the joined profile, so it is resolved to ids first
      // rather than filtered through the embed, which would filter the embed
      // and not the row. `%`, `,` and brackets are stripped: all are PostgREST
      // filter syntax, and this string is interpolated into it.
      const clauses = [`name.ilike.%${safeQ}%`, `name_en.ilike.%${safeQ}%`, `city.ilike.%${safeQ}%`];
      if (ownerIds.length) clauses.push(`created_by.in.(${ownerIds.join(",")})`);
      out = out.or(clauses.join(","));
    }
    return out as T;
  };

  const { count, error: countErr } = await applyFilters(
    supabase.from("businesses").select("id", { count: "exact", head: true })
  );

  let query = supabase
    .from("businesses")
    .select(
      `
      id,
      name,
      name_en,
      category,
      city,
      status,
      created_at,
      created_by,
      profiles!businesses_created_by_fkey ( id, full_name, email )
    `
    )
    .order("created_at", { ascending: false });

  query = applyFilters(query);

  const total = countErr ? 0 : count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * ADMIN_PAGE_SIZE;

  const { data: businesses, error } =
    total === 0 ? { data: [], error: null } : await query.range(from, from + ADMIN_PAGE_SIZE - 1);

  if (error) {
    // Surface it — an empty admin list that is really a failed query has cost
    // us a blind day once already (PGRST201, two FKs to profiles).
    console.error("Error fetching businesses:", error);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <div className="font-bold mb-1">خطا در بارگذاری کسب‌وکارها</div>
        <div className="text-sm">{error.message}</div>
      </div>
    );
  }

  const typedBusinesses = (businesses || []).map((b) => ({
    ...b,
    profiles: Array.isArray(b.profiles) ? b.profiles[0] : b.profiles,
  })) as any[];

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[color:var(--text)]">مدیریت کسب‌وکارها</h1>
          <p className="text-[color:var(--muted-text)] mt-1">
            در این بخش می‌توانید لیست تمامی کسب‌وکارهای ثبت شده در پلتفرم را بررسی، تایید و مدیریت کنید.
          </p>
        </div>
        <Link
          href="/admin/listings/import"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:opacity-90 transition-opacity text-sm shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ایمپورت گروهی (AI)</span>
        </Link>
      </div>

      <ListingsClient
        businesses={typedBusinesses}
        q={q}
        status={status}
        pagination={
          <AdminPagination
            page={safePage}
            total={total}
            basePath="/admin/listings"
            params={{ q: q || undefined, status: status || undefined }}
            itemLabel="کسب‌وکار"
          />
        }
      />
    </div>
  );
}

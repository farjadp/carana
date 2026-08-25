// ============================================================================
// Source: app/admin/(dashboard)/users/page.tsx
// Version: 1.1.0 — 2026-08-25 (paged)
// Why: Fetch actual profiles from Supabase on the server and render the client list.
//      Paged because an unbounded select is capped at 1,000 rows by PostgREST
//      with no error — harmless at 8 profiles, silent data loss at 1,001.
// Env / Identity: Server-side data fetching with authenticated user context.
// ============================================================================
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/session";
import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";
import { UserListClient } from "./user-list-client";

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

  return (
    <>
      <UserListClient
        initialUsers={profiles ?? []}
        currentUserId={currentUser?.id ?? ""}
      />
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white">
        <AdminPagination page={page} total={count ?? 0} basePath="/admin/users" itemLabel="کاربر" />
      </div>
    </>
  );
}

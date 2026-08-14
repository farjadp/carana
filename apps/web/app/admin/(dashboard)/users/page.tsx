// ============================================================================
// Source: app/admin/(dashboard)/users/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Fetch actual profiles from Supabase on the server and render the client list.
// Env / Identity: Server-side data fetching with authenticated user context.
// ============================================================================
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth/session";
import { UserListClient } from "./user-list-client";

export default async function AdminUsersPage() {
  const currentUser = await getOptionalUser();
  const supabase = await createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  return (
    <UserListClient
      initialUsers={profiles ?? []}
      currentUserId={currentUser?.id ?? ""}
    />
  );
}

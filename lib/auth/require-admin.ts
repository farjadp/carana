// ============================================================================
// Source: lib/auth/require-admin.ts
// Version: 1.0.0 — 2026-08-13
// Why: Single source of truth for admin/moderator authorization checks.
//      Previously duplicated inline in users/, listings/ and categories/ actions,
//      and missing entirely from the bulk-insert route.
// Env / Identity: Reads the role via the admin client so the check cannot be
//      defeated by RLS gaps on public.profiles.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AdminLevel = "admin" | "moderator";

export class NotAuthorizedError extends Error {
  constructor(message = "شما مجوز دسترسی به این عملیات را ندارید.") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

export class NotAuthenticatedError extends Error {
  constructor(message = "احراز هویت انجام نشده است.") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Assert that the caller of `supabase` is signed in and holds one of `allowed`.
 *
 * Pass the request-scoped client (action or route-handler client) so the
 * identity comes from the caller's own cookies, never from the service role.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  allowed: AdminLevel[] = ["admin", "moderator"]
): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new NotAuthenticatedError();
  }

  // Read the role with the service-role client: an RLS misconfiguration on
  // profiles must never be able to turn this check into a silent pass.
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || !allowed.includes(profile.role as AdminLevel)) {
    throw new NotAuthorizedError();
  }

  return user;
}

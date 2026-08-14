// ============================================================================
// Source: lib/auth/session.ts
// Version: 1.4.0 — 2026-08-11
// Why: Centralize session reads, redirects, and safe next-path handling.
// Env / Identity: Uses the SSR Supabase client and protects internal redirects.
// ============================================================================
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getOptionalUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser(nextPath?: string) {
  const user = await getOptionalUser();

  if (!user) {
    const target = nextPath
      ? `/auth/login?next=${encodeURIComponent(nextPath)}`
      : "/auth/login";
    redirect(target);
  }

  return user;
}

export async function redirectIfAuthenticated(target = "/profile") {
  const user = await getOptionalUser();

  if (user) {
    redirect(target);
  }
}

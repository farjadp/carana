// ============================================================================
// Source: lib/profiles/ensure-profile.ts
// Version: 1.4.0 — 2026-08-11
// Why: Ensure each authenticated user has a backend profile record when possible.
// Env / Identity: Uses the server-only Supabase admin client.
// ============================================================================
import type { User } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function ensureUserProfile(user: User): Promise<{
  profile: AppProfile | null;
  status: "ready" | "missing_table" | "error";
}> {
  const admin = createSupabaseAdminClient();

  // 1. Try to read the profile first (most common case since database trigger handles it on registration)
  const { data: existingProfile, error: readError } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return {
      profile: existingProfile as AppProfile,
      status: "ready",
    };
  }

  if (readError) {
    // Table missing before the migration is applied should not break login flow.
    if (readError.code === "42P01" || readError.code === "PGRST205") {
      return {
        profile: null,
        status: "missing_table",
      };
    }

    return {
      profile: null,
      status: "error",
    };
  }

  // 2. Fallback: If profile doesn't exist yet, attempt to upsert it.
  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    role:
      typeof user.user_metadata.desired_role === "string"
        ? user.user_metadata.desired_role
        : "user",
  };

  const { data: newProfile, error: upsertError } = await admin
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, email, full_name, role, created_at, updated_at")
    .single();

  if (!upsertError) {
    return {
      profile: newProfile as AppProfile,
      status: "ready",
    };
  }

  if (upsertError.code === "42P01" || upsertError.code === "PGRST205") {
    return {
      profile: null,
      status: "missing_table",
    };
  }

  return {
    profile: null,
    status: "error",
  };
}

// ============================================================================
// Source: lib/auth/bearer.ts
// Version: 1.0.0 — 2026-08-15
// Why: The mobile app cannot carry the web's cookie session, so its API calls
//      send the Supabase access token as `Authorization: Bearer …`. This
//      resolves that token to a user by asking Supabase Auth — no local JWT
//      parsing, so key rotation and revocation are honoured.
// Env / Identity: Server only. Uses the publishable key with the caller's own
//      token, so the resulting client is RLS-scoped to that user.
// ============================================================================
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/env";

export type BearerAuth = { user: User; supabase: SupabaseClient; token: string };

/**
 * Returns the caller's user and an RLS-scoped client, or null if the header
 * is missing or the token is not valid for a live session.
 */
export async function authenticateBearer(req: Request): Promise<BearerAuth | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;

  const supabase = createClient(serverEnv.supabaseUrl, serverEnv.supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { user, supabase, token };
}

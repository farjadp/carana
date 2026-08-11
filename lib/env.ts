// ============================================================================
// Source: lib/env.ts
// Version: 1.2.0 — 2026-08-11
// Why: Validate public and server-side Supabase environment variables centrally.
// Env / Identity: Reads NEXT_PUBLIC_SUPABASE_* and SUPABASE_* variables.
// ============================================================================
function getRequiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const publicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

export const env = {
  supabaseUrl: getRequiredEnv("SUPABASE_URL", publicSupabaseUrl),
  supabasePublishableKey: getRequiredEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    publicSupabasePublishableKey
  ),
};

export const serverEnv = {
  supabaseUrl: getRequiredEnv("SUPABASE_URL", process.env.SUPABASE_URL),
  supabasePublishableKey: getRequiredEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    process.env.SUPABASE_PUBLISHABLE_KEY
  ),
  supabaseSecretKey: getRequiredEnv(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY
  ),
  supabaseJwksUrl: getRequiredEnv("SUPABASE_JWKS_URL", process.env.SUPABASE_JWKS_URL),
};

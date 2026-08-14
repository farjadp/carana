// ============================================================================
// Source: lib/env.ts
// Version: 1.4.1 — 2026-08-11
// Why: Validate public and server-side Supabase environment variables centrally.
// Env / Identity: Reads NEXT_PUBLIC_SUPABASE_* and SUPABASE_* variables.
// ============================================================================
function getRequiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  get supabaseUrl() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", val);
  },
  get supabasePublishableKey() {
    const val = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
    return getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", val);
  },
  /**
   * Absolute origin for auth redirect links.
   *
   * Falling back to localhost silently is only acceptable in development —
   * in production it produces password-reset emails that point at the
   * developer's machine, so require it explicitly there.
   */
  get baseUrl() {
    const val = process.env.NEXT_PUBLIC_BASE_URL;
    if (val) return val.replace(/\/$/, "");

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_BASE_URL");
    }

    return "http://localhost:3000";
  },
};

export const serverEnv = {
  get supabaseUrl() {
    return getRequiredEnv("SUPABASE_URL", process.env.SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return getRequiredEnv("SUPABASE_PUBLISHABLE_KEY", process.env.SUPABASE_PUBLISHABLE_KEY);
  },
  get supabaseSecretKey() {
    return getRequiredEnv("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get supabaseJwksUrl() {
    return getRequiredEnv("SUPABASE_JWKS_URL", process.env.SUPABASE_JWKS_URL);
  },
  get disableEmailConfirmationForTesting() {
    return process.env.SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING === "true";
  },
};

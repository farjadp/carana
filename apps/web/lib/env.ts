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
   * Absolute origin, used for auth redirect links, robots.txt and the sitemap.
   *
   * Resolution order:
   *   1. NEXT_PUBLIC_BASE_URL — set this to the real domain; it always wins.
   *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain, set
   *      by Vercel on every build including previews.
   *   3. VERCEL_URL — the per-deployment URL, so preview builds get something
   *      absolute and correct for themselves.
   *   4. localhost, for local development.
   *
   * The earlier version threw whenever NODE_ENV was production, which broke
   * the build outright: `next build` runs in production mode, and the
   * robots.txt/sitemap routes are prerendered during it.
   */
  get baseUrl() {
    const explicit = process.env.NEXT_PUBLIC_BASE_URL;
    if (explicit) return explicit.replace(/\/$/, "");

    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (productionHost) return `https://${productionHost.replace(/\/$/, "")}`;

    const deploymentHost = process.env.VERCEL_URL;
    if (deploymentHost) return `https://${deploymentHost.replace(/\/$/, "")}`;

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

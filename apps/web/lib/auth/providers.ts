// ============================================================================
// Source: lib/auth/providers.ts
// Version: 1.0.0 — 2026-08-26
// Why: «ادامه با حساب گوگل» was rendered unconditionally from 18 August,
//      and Google is NOT enabled on this project — `GET /auth/v1/settings`
//      answers `external.google: false`, so every click ended in
//      "Unsupported provider". A button that cannot do what it says is the
//      house rule's own example of what may not ship.
//
//      Rather than delete it and re-add it later by hand, the button now
//      follows the project's real configuration: this reads the same public
//      settings endpoint the Supabase client itself uses, cached for five
//      minutes. The day the provider is switched on in the dashboard, the
//      button appears on its own; until then nothing claims it exists.
// Env / Identity: Server-only. Uses the publishable key — /auth/v1/settings
//      is a public, unauthenticated endpoint by design.
// ============================================================================
import "server-only";

import { env } from "@/lib/env";

export type EnabledAuthProviders = {
  /** Google OAuth is configured AND enabled on the Supabase project. */
  google: boolean;
};

const NONE: EnabledAuthProviders = { google: false };

/**
 * Ask the project which external providers are actually on.
 *
 * Fails closed. If the probe errors, times out or answers anything
 * unexpected, we show no OAuth button — the cost is one hidden button, and
 * the alternative is a button that throws.
 */
export async function getEnabledAuthProviders(): Promise<EnabledAuthProviders> {
  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabasePublishableKey },
      // Caching is opt-in since Next 15 — `revalidate` alone would refetch on
      // every render of every auth page (node_modules/next/dist/docs,
      // 01-app/03-api-reference/04-functions/fetch.md).
      cache: "force-cache",
      next: { revalidate: 300 },
    });

    if (!response.ok) return NONE;

    const body = (await response.json()) as { external?: Record<string, unknown> };
    return { google: body?.external?.google === true };
  } catch {
    return NONE;
  }
}

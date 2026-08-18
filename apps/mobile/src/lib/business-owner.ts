// ============================================================================
// Source: apps/mobile/src/lib/business-owner.ts
// Why: `profiles` is self-or-admin under RLS and stays that way, so the app
//      cannot read an owner's name with the anon key. The web app's public
//      /api/mobile/business-owner route resolves it with the service role
//      behind the same gates the website applies (verified, claimed by a real
//      person, has a name, not hidden by a Premium owner).
// Env / Identity: Client. Same EXPO_PUBLIC_API_URL base as lib/api.ts.
// ============================================================================
import type { PublicOwner } from "@charana/core";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "https://charana.ca").replace(/\/$/, "");

/**
 * Returns null on any failure and on every "should not be shown" case alike —
 * the screen simply omits the section. There is no error state to render here:
 * "we could not load the owner" tells a visitor nothing they can act on.
 */
export async function fetchBusinessOwner(businessId: string): Promise<PublicOwner | null> {
  try {
    const res = await fetch(`${BASE}/api/mobile/business-owner?businessId=${encodeURIComponent(businessId)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { owner: PublicOwner | null };
    return json.owner ?? null;
  } catch {
    return null;
  }
}

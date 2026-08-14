// ============================================================================
// Source: lib/auth/redirect.ts
// Version: 1.4.0 — 2026-08-11
// Why: Share safe internal redirect logic between client and server auth flows.
// Env / Identity: Pure utility logic, no secret usage.
// ============================================================================
export function getSafeNextPath(candidate: string | null | undefined, fallback = "/profile") {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.startsWith("/auth/logout")) return fallback;

  return candidate;
}

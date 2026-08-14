// ============================================================================
// Source: lib/auth/sanitize.ts
// Version: 1.3.1 — 2026-08-11
// Why: Strip unsafe auth query parameters before rendering auth pages.
// Env / Identity: Server-safe utility, no secret usage.
// ============================================================================
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/redirect";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function getSingle(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export async function sanitizeAuthSearchParams(
  pathname: string,
  searchParams: SearchParams
) {
  const resolved = await searchParams;
  const next = getSafeNextPath(getSingle(resolved.next), "/dashboard");

  const hasUnsafeParams = ["password", "email", "full-name", "full_name"].some(
    (key) => getSingle(resolved[key])
  );

  if (!hasUnsafeParams) {
    return;
  }

  const target =
    next && next !== "/dashboard"
      ? `${pathname}?next=${encodeURIComponent(next)}`
      : pathname;

  redirect(target);
}

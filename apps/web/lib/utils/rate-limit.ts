// ============================================================================
// Source: lib/utils/rate-limit.ts
// Version: 1.0.0 — 2026-08-20
// Why: Cap how often a single user can hit the paid AI endpoints.
// Env / Identity: In-memory, per server instance.
//
// NOTE: this is deliberately simple. It resets on deploy and is not shared
// between instances, so it stops accidental hammering and casual abuse but is
// not a defence against a determined attacker across a scaled deployment.
// Move to Supabase or Upstash Redis before relying on it in production.
// ============================================================================

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound on a long-lived instance.
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window limiter.
 *
 * @param key    Identity to limit on — use the user id, never the IP alone.
 * @param limit  Requests allowed per window.
 * @param windowSeconds Window length.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

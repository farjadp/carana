// ============================================================================
// Source: instrumentation-client.ts
// Version: 1.0.0 — 2026-08-25
// Why: Browser-side error reporting. Runs before the app becomes interactive.
// Env / Identity: Uses NEXT_PUBLIC_SENTRY_DSN — a client DSN is designed to be
//      public, it only accepts events. Inert when unset.
//
//      No session replay and no PII. A replay of a business owner filling in
//      their licence number is a liability that catches no bug worth it.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

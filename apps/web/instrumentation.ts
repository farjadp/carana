// ============================================================================
// Source: instrumentation.ts
// Version: 1.0.0 — 2026-08-25
// Why: Server-side error reporting. `register` runs once per server instance;
//      `onRequestError` is how Next hands over errors it caught itself, which
//      a try/catch in application code never sees.
// Env / Identity: Inert unless SENTRY_DSN is set. No DSN means no network
//      calls, so local runs and previews stay quiet by default.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",

    // Traces cost money and answer a question nobody is asking yet. The point
    // of this integration is knowing that something broke, not how fast it was.
    tracesSampleRate: 0,

    // This is a Persian-language directory: business names, phone numbers and
    // private notes all pass through these requests. Never attach request
    // bodies or user identifiers to an error report.
    sendDefaultPii: false,
  });
}

export const onRequestError = Sentry.captureRequestError;

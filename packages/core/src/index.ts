// ============================================================================
// Source: packages/core/src/index.ts
// Version: 1.0.0 — 2026-08-21
// Why: Single entry point for everything web and mobile genuinely share.
// Env / Identity: Pure types and validation. No runtime secrets, no platform
//      APIs — nothing here may import next/*, react-native or node built-ins,
//      or it stops being consumable from the Expo bundle.
// ============================================================================

// Brand constants — name, domain, palette. One place, by decision.
export * from "./brand";

// Generated from the live Supabase schema — regenerate with `pnpm gen:types`.
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

// Form validation shared between the web dashboard and the mobile app.
export * from "./business-schema";

// Domain constants that both platforms must agree on.
export * from "./listing-status";

// Normalisation for third-party directory imports.
export * from "./import-normalize";

// URL slugs that survive Persian input.
export * from "./slug";

// Province taxonomy for the province -> city browse hierarchy.
export * from "./provinces";

// One definition of "verified" for web and mobile.
export * from "./verification-status";

// One definition of "busy now / quiet now" for web and mobile.
export * from "./live-status";

// One rule for "may we name the person behind this listing?".
export * from "./owner-identity";

// The hiring board: what a job post is, and the one rule for "is it live".
export * from "./jobs";

// Tehran clock + Jalali/Shahanshahi date, shared so web and mobile agree.
export * from "./iran-calendar";

// Plan definitions and quantity limits — one source for web, mobile and
// the server-side entitlement clamps.
export * from "./plans";

// What a plan actually unlocks right now (expiry-aware), and the two
// orderings that depend on it — shared so the app and the site cannot rank
// the same directory differently. Moved out of apps/web on 24 Aug.
export * from "./entitlements";

// Persian messages for Supabase Auth errors (web + mobile).
export * from "./auth-errors";

// Draining a query past PostgREST's silent 1,000-row cap. Shared because the
// cap is a property of the API, not of one client.
export * from "./fetch-all";

// Persian/Arabic-Indic digits to ASCII. Canonical copy — the app forces RTL,
// so anything parsed as ASCII digits must fold first.
export * from "./digits";

// GPLZ Link: handle rules, short-link building, and the one table that says
// what each of the two link-in-bio packages includes.
export * from "./link";

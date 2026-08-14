// ============================================================================
// Source: packages/core/src/index.ts
// Version: 1.0.0 — 2026-08-21
// Why: Single entry point for everything web and mobile genuinely share.
// Env / Identity: Pure types and validation. No runtime secrets, no platform
//      APIs — nothing here may import next/*, react-native or node built-ins,
//      or it stops being consumable from the Expo bundle.
// ============================================================================

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

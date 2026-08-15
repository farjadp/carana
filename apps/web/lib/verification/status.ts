// ============================================================================
// Source: lib/verification/status.ts
// Version: 2.0.0 — 2026-08-15
// Why: Re-export. The single definition of "verified" now lives in
//      @charana/core so the mobile app reads the same rules. Web imports keep
//      working unchanged.
// ============================================================================
export * from "@charana/core/verification-status";

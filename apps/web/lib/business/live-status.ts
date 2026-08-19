// ============================================================================
// Source: lib/business/live-status.ts
// Version: 2.0.0 — 2026-08-16
// Why: Re-export. The single definition of "busy now / quiet now" moved to
//      @goplaza/core so the mobile app reads the same expiry rule — same
//      reason verification status lives there (see
//      lib/verification/status.ts). Imported from the package root, not a
//      subpath: Turbopack does not resolve subpath exports of a workspace
//      package.
// ============================================================================
export {
  BUSY_STATUS_HOURS,
  activeBusyStatus,
  type BusyStatus,
  type BusyStatusRow,
} from "@goplaza/core";

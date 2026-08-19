// ============================================================================
// Source: lib/verification/status.ts
// Version: 2.1.0 — 2026-08-15
// Why: Re-export. The single definition of "verified" lives in @goplaza/core
//      so the mobile app reads the same rules. Imported from the package root
//      (not a subpath) — Turbopack does not resolve subpath exports of a
//      workspace package.
// ============================================================================
export {
  VERIFICATION_WINDOW_DAYS,
  PUBLIC_COUNTDOWN_THRESHOLD_DAYS,
  RENEWAL_OPENS_DAYS_BEFORE,
  REMINDER_STAGES,
  METHOD_LABEL,
  METHOD_EXPLANATION,
  STATE_LABEL,
  getVerificationStatus,
  reminderStageFor,
  reminderIsDue,
  nextExpiry,
  isTrusted,
  type ReminderStage,
  type VerificationMethod,
  type VerificationState,
  type VerifiableBusiness,
  type VerificationStatus,
} from "@goplaza/core";

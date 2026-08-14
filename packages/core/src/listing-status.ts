// ============================================================================
// Source: packages/core/src/listing-status.ts
// Version: 1.0.0 — 2026-08-21
// Why: One definition of the listing state machine for web, mobile and admin.
// Env / Identity: Pure data. Mirrors the public.business_status enum.
// ============================================================================
import type { Enums } from "./database.types";

export type ListingStatus = Enums<"business_status">;

export const LISTING_STATUSES: ListingStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "NEEDS_CHANGES",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
];

/** Statuses an owner is allowed to leave a row in. Mirrors the RLS policy. */
export const OWNER_WRITABLE_STATUSES: ListingStatus[] = ["DRAFT", "SUBMITTED"];

/** Statuses that are visible to the public. Mirrors businesses_public_read. */
export const PUBLIC_STATUSES: ListingStatus[] = ["PUBLISHED", "APPROVED"];

export function isPubliclyVisible(status: ListingStatus | null | undefined) {
  return !!status && PUBLIC_STATUSES.includes(status);
}

export const LISTING_STATUS_LABELS_FA: Record<ListingStatus, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "در انتظار بررسی",
  NEEDS_CHANGES: "نیازمند اصلاح",
  APPROVED: "تایید شده",
  PUBLISHED: "منتشر شده",
  REJECTED: "رد شده",
};

/**
 * Columns that must never be selected for a public view.
 *
 * Postgres does not enforce RLS per column, so this list is the only thing
 * standing between a careless `select("*")` and leaking verification data.
 */
export const PRIVATE_BUSINESS_COLUMNS = [
  "business_number",
  "license_info",
  "verification_documents",
  "verification_notes",
] as const;

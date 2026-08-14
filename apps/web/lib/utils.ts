// ============================================================================
// Source: lib/utils.ts
// Version: 1.2.0 — 2026-08-11
// Why: Centralize utility helpers such as cn() for Tailwind class merging.
// Env / Identity: Utility-only module, no secret usage.
// ============================================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

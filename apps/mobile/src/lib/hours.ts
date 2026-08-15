// ============================================================================
// Source: apps/mobile/src/lib/hours.ts
// Version: 1.0.0 — 2026-08-15
// Why: One implementation of "is it open right now". The profile screen had it
//      inline; the home screen's open-now rail needs the same answer, and two
//      copies of a clock comparison drift.
// Env / Identity: Pure functions over the stored working_hours shape.
// ============================================================================
export type DayHours = { open?: string; close?: string; closed?: boolean };
export type WorkingHours = Record<string, DayHours>;

/** `js` is the value Date#getDay returns for that day. */
export const DAYS = [
  { key: "saturday", label: "شنبه", js: 6 },
  { key: "sunday", label: "یکشنبه", js: 0 },
  { key: "monday", label: "دوشنبه", js: 1 },
  { key: "tuesday", label: "سه‌شنبه", js: 2 },
  { key: "wednesday", label: "چهارشنبه", js: 3 },
  { key: "thursday", label: "پنجشنبه", js: 4 },
  { key: "friday", label: "جمعه", js: 5 },
] as const;

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export type OpenState = { open: boolean; label: string } | null;

/**
 * `null` means "we do not know" — no hours registered for today. That is a
 * different answer from "closed", and the UI must not render it as one.
 */
export function openNow(hours: WorkingHours | null | undefined, now = new Date()): OpenState {
  if (!hours || !Object.keys(hours).length) return null;

  const today = DAYS.find((d) => d.js === now.getDay());
  const h = today ? hours[today.key] : undefined;
  if (!h) return null;
  if (h.closed || !h.open || !h.close) return { open: false, label: "امروز تعطیل" };

  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  if ([oh, om, ch, cm].some((v) => Number.isNaN(v))) return null;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = minutes >= oh * 60 + om && minutes < ch * 60 + cm;

  return {
    open: isOpen,
    label: isOpen ? `باز است · تا ${fa(h.close)}` : `بسته است · ${fa(h.open)} باز می‌شود`,
  };
}

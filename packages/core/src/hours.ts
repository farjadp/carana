// ============================================================================
// Source: packages/core/src/hours.ts
// Version: 1.0.0 — 2026-08-25
// Why: "Is this place open right now?" — asked first by the GPLZ Link bio
//      page, and by the profile and the mobile app after it. It lives in core
//      so all three answer with the same clock; a second hand-written copy of
//      this is how one surface says باز است while another says بسته است about
//      the same shop at the same moment.
//
//      THE TIMEZONE COMES FROM THE PROVINCE, not from a single national
//      default. The analytics rollup buckets by America/Toronto and accepts a
//      three-hour skew for British Columbia, because a chart that is shifted
//      is merely shifted. "باز است" is not like that: on a Vancouver shop at
//      9pm Pacific, a Toronto clock would read midnight and the page would
//      say closed while the door is open — or worse, the reverse. A wrong
//      status sends someone across a city. So the map below is small and
//      worth having.
//
//      Saskatchewan does not observe DST; using `America/Regina` rather than
//      `America/Winnipeg` is what makes that correct for half the year.
//
// Env / Identity: Pure. Uses Intl, which both the browser and Hermes provide.
// ============================================================================
import { resolveProvince } from "./provinces";

export type DayHours = { open?: string | null; close?: string | null; closed?: boolean };
/** Keyed by lowercase English weekday, as the column is written today. */
export type WorkingHours = Record<string, DayHours | null | undefined>;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const ZONE_BY_PROVINCE_CODE: Record<string, string> = {
  ON: "America/Toronto",
  QC: "America/Toronto",
  NB: "America/Halifax",
  NS: "America/Halifax",
  PE: "America/Halifax",
  NL: "America/St_Johns",
  MB: "America/Winnipeg",
  SK: "America/Regina", // no DST, deliberately not Winnipeg
  AB: "America/Edmonton",
  BC: "America/Vancouver",
  YT: "America/Whitehorse",
  NT: "America/Yellowknife",
  NU: "America/Iqaluit",
};

/**
 * The clock a listing's hours should be read against. Falls back to Toronto,
 * which is where most of the directory is — a fallback, not an assumption.
 */
export function timezoneForProvince(province: string | null | undefined): string {
  const code = resolveProvince(province)?.code;
  return (code && ZONE_BY_PROVINCE_CODE[code]) || "America/Toronto";
}

/** Minutes since midnight in `zone`, plus which weekday it is there. */
function localNow(zone: string, now: Date): { minutes: number; weekday: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // "24" appears for midnight under hour12:false in some engines.
  const hour = Number(get("hour")) % 24;
  return { minutes: hour * 60 + Number(get("minute")), weekday: get("weekday").toLowerCase() };
}

function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

export type OpenState =
  | { known: false }
  | { known: true; open: boolean; closesAt?: string; opensAt?: string; weekday: string };

/**
 * Is it open right now?
 *
 * Returns `{ known: false }` when the hours are absent or unparseable, and the
 * caller must then render NOTHING rather than guessing. A confident "بسته است"
 * on a shop whose hours we simply never collected is a false statement about
 * someone's business, and there are thousands of imported listings with no
 * hours at all.
 *
 * A close time earlier than the open time is read as passing midnight, which
 * is how a restaurant open until 2am is written.
 */
export function openState(
  hours: WorkingHours | null | undefined,
  province: string | null | undefined,
  now = new Date(),
): OpenState {
  if (!hours || typeof hours !== "object") return { known: false };

  const zone = timezoneForProvince(province);
  const { minutes, weekday } = localNow(zone, now);
  const today = hours[weekday];
  if (today === undefined || today === null) return { known: false };

  if (today.closed) {
    return { known: true, open: false, weekday };
  }

  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (open === null || close === null) return { known: false };

  // Past midnight: yesterday's late window can still be running.
  if (close <= open) {
    const yesterday = hours[WEEKDAYS[(WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]) + 6) % 7]];
    const yClose = yesterday && !yesterday.closed ? toMinutes(yesterday.close) : null;
    const yOpen = yesterday && !yesterday.closed ? toMinutes(yesterday.open) : null;
    const stillOpenFromYesterday = yClose !== null && yOpen !== null && yClose <= yOpen && minutes < yClose;
    if (stillOpenFromYesterday) return { known: true, open: true, closesAt: yesterday!.close!, weekday };
    return minutes >= open
      ? { known: true, open: true, closesAt: today.close!, weekday }
      : { known: true, open: false, opensAt: today.open!, weekday };
  }

  return minutes >= open && minutes < close
    ? { known: true, open: true, closesAt: today.close!, weekday }
    : { known: true, open: false, opensAt: minutes < open ? today.open! : undefined, weekday };
}

export const WEEKDAY_FA: Record<string, string> = {
  saturday: "شنبه",
  sunday: "یکشنبه",
  monday: "دوشنبه",
  tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه",
  thursday: "پنجشنبه",
  friday: "جمعه",
};

/** Persian-week order, which starts on Saturday. */
export const WEEK_ORDER_FA = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

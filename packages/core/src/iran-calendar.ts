// ============================================================================
// Source: packages/core/src/iran-calendar.ts
// Version: 1.0.0 — 2026-08-16
// Why: Tehran clock + Jalali (Solar Hijri) + Shahanshahi (Imperial) date for
//      the footer widget, shared so web and mobile show the same numbers.
//      The Gregorian<->Jalali conversion is the standard astronomical
//      algorithm (the same one behind the widely used jalaali-js package) —
//      not a lookup table, so it stays correct indefinitely rather than
//      until whoever wrote the table stopped extending it.
// Env / Identity: Pure logic. `nowInTehran()` uses Intl's tz database (via
//      Intl.DateTimeFormat), not a fixed UTC offset, so Iran's DST rules
//      (when in effect) are handled the same way the platform handles them —
//      never hand-roll a timezone offset.
// ============================================================================

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + div(gm - 8, 6) + 100100, 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): [number, number, number] {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return [gy, gm, gd];
}

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error(`Invalid Jalaali year ${jy}`);
  let jm = jp;
  let jump = 0;
  let i = 1;
  for (; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function d2j(jdn: number): [number, number, number] {
  const gy = d2g(jdn)[0];
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return [jy, jm, jd];
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return [jy, jm, jd];
}

/** Gregorian calendar date → [Jalali year, month (1-12), day]. */
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  return d2j(g2d(gy, gm, gd));
}

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

/**
 * The Imperial (Shahanshahi) calendar Mohammad Reza Shah introduced in 1976,
 * epoch at Cyrus the Great's accession (559 BCE). Shahanshahi year = Jalali
 * year + 1180 — the jump the 1976 changeover actually made (1355 → 2535).
 */
export function toShahanshahi(jalaliYear: number): number {
  return jalaliYear + 1180;
}

const faDigits = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
export { faDigits };

export type TehranNow = {
  jy: number; jm: number; jd: number;
  shahanshahiYear: number;
  hour: number; minute: number; second: number;
};

/** Current Tehran wall-clock date/time, via Intl's tz database — never a
 *  hand-rolled UTC offset, which would silently drift whenever Iran's DST
 *  rules are in effect. */
export function nowInTehran(date = new Date()): TehranNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const [jy, jm, jd] = toJalali(get("year"), get("month"), get("day"));
  return {
    jy, jm, jd,
    shahanshahiYear: toShahanshahi(jy),
    hour: get("hour"), minute: get("minute"), second: get("second"),
  };
}

/** "۲۶ مرداد ۱۴۰۵ (شاهنشاهی ۲۵۸۵)" */
export function formatTehranDate(t: TehranNow): string {
  return `${faDigits(t.jd)} ${JALALI_MONTHS[t.jm - 1]} ${faDigits(t.jy)} (شاهنشاهی ${faDigits(t.shahanshahiYear)})`;
}

/** "۱۴:۰۵" */
export function formatTehranTime(t: TehranNow): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return faDigits(`${pad(t.hour)}:${pad(t.minute)}`);
}

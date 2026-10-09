// ============================================================================
// Source: packages/core/src/digits.check.mts
// Version: 1.0.0 — 2026-10-09
// Why: faNumber was toLocaleString("fa-IR"), which Hermes on Android
//      rendered as «۹,۶۹۴» (Latin comma) on the live home hero. It is now
//      built by hand; these assertions pin it to what V8 prints for fa-IR,
//      so web call sites see no change and mobile finally matches.
//      Run: `npx tsx src/digits.check.mts` from packages/core.
// Env / Identity: Pure. No IO.
// ============================================================================
import { faNumber, faDigits, toLatinDigits } from "./digits.js";

let fail = 0;
const is = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fail++;
    console.log(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${label}`);
  }
};

// Expected values are V8's n.toLocaleString("fa-IR"), captured 9 Oct.
is("home hero count", faNumber(9694), "۹٬۶۹۴");
is("zero", faNumber(0), "۰");
is("under a thousand has no separator", faNumber(17), "۱۷");
is("millions", faNumber(1234567), "۱٬۲۳۴٬۵۶۷");
is("decimal uses momayyez", faNumber(1.5), "۱٫۵");
is("three fraction digits, rounded", faNumber(12.3456), "۱۲٫۳۴۶");
is("leading zero fraction", faNumber(0.1234), "۰٫۱۲۳");
is("negative matches V8", faNumber(-5), "‎−۵");
is("negative rounding to zero is not signed", faNumber(-0.0001), "۰");
is("no Latin digit or comma survives", /[0-9,]/.test(faNumber(9876543.21)), false);
is("V8 agrees on integers", faNumber(48261), (48261).toLocaleString("fa-IR"));

is("faDigits keeps no grouping", faDigits(2026), "۲۰۲۶");
is("round trip", toLatinDigits(faNumber(1234)), "1٬234");

console.log(fail ? `\n${fail} FAILED` : `\nall passed`);
process.exit(fail ? 1 : 0);

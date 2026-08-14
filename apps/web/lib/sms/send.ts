// ============================================================================
// Source: apps/web/lib/sms/send.ts
// Version: 1.0.0 — 2026-08-24
// Why: Send SMS through Twilio, for contact verification.
// Env / Identity: Server only. Uses an API Key rather than the account auth
//      token, so the credential can be revoked without touching the account.
//
// Twilio's REST API is a plain form POST, so there is no SDK here — one fetch
// is less to keep updated and less to ship.
// ============================================================================
import "server-only";

import { reportQuietFailure } from "@/lib/observability/report";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const FROM = process.env.TWILIO_FROM_NUMBER;

export type SmsResult = { sent: boolean; sid?: string; error?: string };

/**
 * Persian (U+06F0–U+06F9) and Arabic-Indic (U+0660–U+0669) digits to ASCII.
 *
 * The whole product is Persian and runs RTL, so the keyboard opens in Persian
 * and a phone number typed there contains none of the characters a digit check
 * looks for. Without this the number is simply rejected as invalid.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Normalise to E.164, which is the only format Twilio accepts.
 *
 * Bare 10-digit input is assumed to be North American — the audience is in
 * Canada. Anything already carrying a country code is left alone.
 */
export function toE164(raw: string): string | null {
  const trimmed = toLatinDigits(raw).trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!ACCOUNT_SID || !API_KEY_SID || !API_KEY_SECRET || !FROM) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms:dev] to=${to}\n${body}`);
      return { sent: false, error: "Twilio not configured (logged instead)" };
    }
    reportQuietFailure("sms_not_configured", { to });
    return { sent: false, error: "sms is not configured" };
  }

  const e164 = toE164(to);
  if (!e164) return { sent: false, error: "شماره موبایل معتبر نیست." };

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${API_KEY_SID}:${API_KEY_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: e164, From: FROM, Body: body }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    const data = (await res.json()) as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      // Log Twilio's own code — it is what their docs are indexed by. 30034
      // and its neighbours mean carrier filtering, which is the signal that
      // A2P registration stopped being optional.
      reportQuietFailure(
        data.code && data.code >= 30000 && data.code < 30100
          ? "sms_carrier_rejected"
          : "sms_send_failed",
        { code: data.code, reason: data.message }
      );

      // 21211 is an invalid destination; that one is the user's to fix.
      if (data.code === 21211) return { sent: false, error: "شماره موبایل معتبر نیست." };

      return { sent: false, error: "ارسال پیامک انجام نشد." };
    }

    return { sent: true, sid: data.sid };
  } catch (err) {
    reportQuietFailure("sms_send_failed", { reason: String(err) });
    return { sent: false, error: "ارسال پیامک انجام نشد." };
  }
}

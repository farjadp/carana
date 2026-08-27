// ============================================================================
// Source: apps/web/lib/email/send.ts
// Version: 1.0.0 — 2026-08-24
// Why: One place that sends mail, so every message shares the same sender,
//      failure handling and logging.
// Env / Identity: Server only. RESEND_API_KEY must never reach a client bundle.
// ============================================================================
import "server-only";

import { Resend } from "resend";

import { reportQuietFailure } from "@/lib/observability/report";

import { company } from "@/lib/data/company";

const DEFAULT_FROM = `${company.brand} <${company.email.noreply}>`;

/**
 * The sender header, repaired if it has to be.
 *
 * Found on 27 Aug: EMAIL_FROM carried one orphaned byte of an accented letter
 * from the pre-rebrand name, and Resend rejected every send
 * with "Invalid `from` field" — silently, because sendEmail returns
 * { sent: false } by design. Verification codes and listing decisions had been
 * failing for real users for days, and the only trace was 17 rows in
 * system_errors that nothing read.
 *
 * So the header is repaired rather than trusted: control characters and U+FFFD
 * (what an invalid byte has become by the time it reaches process.env) are
 * stripped, and anything still not shaped like an address falls back to the
 * brand default. A Persian display name is left alone — that is legal and
 * intended; only unrenderable junk is removed.
 */
function resolveFrom(): string {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) return DEFAULT_FROM;

  const cleaned = raw.replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, "").trim();
  const addressOnly = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  const named = /^[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/;

  if (!addressOnly.test(cleaned) && !named.test(cleaned)) {
    reportQuietFailure("email_from_invalid", { configured: raw, using: DEFAULT_FROM });
    return DEFAULT_FROM;
  }

  if (cleaned !== raw) {
    reportQuietFailure("email_from_invalid", { configured: raw, using: cleaned });
  }

  return cleaned;
}

const FROM = resolveFrom();

/**
 * Created lazily. Reading the key at module scope would make every route that
 * transitively imports this file fail at build time when the key is absent,
 * which is exactly what broke the first Vercel deploys.
 */
let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;

  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  client = new Resend(key);
  return client;
}

export type SendResult = { sent: boolean; id?: string; error?: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const resend = getClient();

  if (!resend) {
    // In development without a key, print instead of failing: a missing key
    // should not make signup or verification look broken locally.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
      return { sent: false, error: "RESEND_API_KEY not set (logged instead)" };
    }
    reportQuietFailure("email_not_configured", { to: input.to, subject: input.subject });
    return { sent: false, error: "email is not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });

    if (error) {
      reportQuietFailure("email_send_failed", { to: input.to, reason: error.message });
      return { sent: false, error: error.message };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    reportQuietFailure("email_send_failed", { to: input.to, reason: String(err) });
    return { sent: false, error: "email send failed" };
  }
}

// ============================================================================
// Source: apps/web/lib/email/send.ts
// Version: 1.0.0 — 2026-08-24
// Why: One place that sends mail, so every message shares the same sender,
//      failure handling and logging.
// Env / Identity: Server only. RESEND_API_KEY must never reach a client bundle.
// ============================================================================
import "server-only";

import { Resend } from "resend";

import { company } from "@/lib/data/company";

const FROM = process.env.EMAIL_FROM ?? `${company.brand} <noreply@charana.ca>`;

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
    console.error("RESEND_API_KEY is not set; email not sent");
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
      console.error("Resend error:", error.message);
      return { sent: false, error: error.message };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("Email send failed:", err);
    return { sent: false, error: "email send failed" };
  }
}

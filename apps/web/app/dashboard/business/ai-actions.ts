// ============================================================================
// Source: app/dashboard/business/ai-actions.ts
// Version: 1.0.0
// Why: Server actions for AI features like website scraping.
// ============================================================================
"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import * as cheerio from "cheerio";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

class InvalidTargetError extends Error {}

// Define a simplified schema for AI to extract. We don't ask it to extract EVERYTHING,
// just the fields that are highly likely to be found on a website.
const extractionSchema = z.object({
  name: z.string().describe("The business name in Persian").optional(),
  name_en: z.string().describe("The business name in English").optional(),
  short_description: z.string().describe("A short summary or tagline of the business in Persian").optional(),
  description: z.string().describe("A comprehensive description of the business in Persian").optional(),
  phone: z.string().describe("The main contact phone number").optional(),
  contact_email: z.string().describe("The contact email address").optional(),
  address: z.string().describe("The physical address of the business").optional(),
  instagram: z.string().describe("The Instagram profile URL").optional(),
  telegram: z.string().describe("The Telegram profile or channel URL").optional(),
  linkedin: z.string().describe("The LinkedIn company profile URL").optional(),
  whatsapp: z.string().describe("The WhatsApp contact link or number").optional(),
});

/**
 * Reject anything that is not a public http(s) host.
 *
 * Without this, the server will happily fetch whatever URL a user types —
 * including localhost, LAN addresses and cloud metadata endpoints — and hand
 * the response body back through the AI extraction (SSRF).
 */
function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidTargetError("آدرس وب‌سایت معتبر نیست.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidTargetError("فقط آدرس‌های http و https پشتیبانی می‌شوند.");
  }

  const host = parsed.hostname.toLowerCase();

  const isBlocked =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    // IPv4 literals in private / loopback / link-local / CGNAT ranges
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host === "0.0.0.0" ||
    // IPv6 loopback / unique-local / link-local
    host === "::1" ||
    host === "[::1]" ||
    /^\[?f[cd]/i.test(host) ||
    /^\[?fe80:/i.test(host);

  if (isBlocked) {
    throw new InvalidTargetError("آدرس داخلی شبکه مجاز نیست.");
  }

  return parsed;
}

export async function scrapeWebsiteForBusiness(url: string) {
  try {
    // This action makes an outbound request and an OpenAI call on behalf of
    // the caller, so it must be signed in and capped.
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "ابتدا وارد حساب کاربری شوید." };
    }

    const limit = rateLimit(`ai:scrape:${user.id}`, 10, 60 * 60);
    if (!limit.allowed) {
      return {
        success: false,
        error: `محدودیت استفاده. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
      };
    }

    // 1. Fetch website HTML
    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    assertPublicHttpUrl(normalizedUrl);

    const response = await fetch(normalizedUrl, {
      // A redirect to an internal address would defeat the check above.
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 } // Cache for an hour to avoid repeated abuse
    });

    if (!response.ok) {
      return { success: false, error: "امکان دسترسی به وب‌سایت وجود ندارد. لطفاً آدرس را بررسی کنید." };
    }

    const html = await response.text();

    // 2. Extract text using Cheerio
    const $ = cheerio.load(html);
    
    // Remove unnecessary elements to save tokens
    $('script, style, noscript, iframe, img, svg, video').remove();
    
    const textContent = $('body').text().replace(/\s+/g, ' ').trim();
    
    // We only take the first ~15,000 characters to avoid huge token usage on very large pages
    const truncatedText = textContent.substring(0, 15000);

    // 3. Extract data using AI
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: extractionSchema,
      prompt: `
        Extract the business details from the following website text content. 
        Translate the extracted information into Persian (Farsi) where applicable (like descriptions), except for names which can be in both languages if available, and keep links/emails as they are.
        
        Website Content:
        ${truncatedText}
      `,
    });

    return { success: true, data: object };
  } catch (error: any) {
    // URL validation failures are the user's to fix, so surface them.
    if (error instanceof InvalidTargetError) {
      return { success: false, error: error.message };
    }

    console.error("AI Scrape Error:", error);
    return { success: false, error: "خطایی در خواندن وب‌سایت یا پردازش هوش مصنوعی رخ داد." };
  }
}

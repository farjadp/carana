// ============================================================================
// Source: app/api/ai/generate/route.ts
// Version: 1.0.0 — 2026-08-12
// Why: Generates AI content for business descriptions, streaming the response.
// Env / Identity: Server-side API Route using OpenAI and Vercel AI SDK.
// ============================================================================
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // This endpoint spends OpenAI credits on every call.
    const limit = rateLimit(`ai:generate:${user.id}`, 20, 60 * 60);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `محدودیت استفاده از هوش مصنوعی. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const { prompt, type } = await req.json();

    if (typeof prompt !== "string" || !prompt.trim()) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    if (prompt.length > 4000) {
      return new NextResponse("Prompt is too long", { status: 400 });
    }

    let systemPrompt = "You are a professional Persian content writer for a business directory in Canada.";
    
    if (type === "business_description") {
      systemPrompt = `
شما یک تولیدکننده محتوای حرفه‌ای و کپی‌رایتر برای دایرکتوری کسب‌وکارهای ایرانی در کانادا (پلازا) هستید.
وظیفه شما این است که با دریافت چند کلمه کلیدی یا نام کسب‌وکار، یک متن «درباره ما» یا توضیحات معرفی جذاب، حرفه‌ای و به زبان فارسی روان (حدود ۱ تا ۲ پاراگراف) بنویسید.
لحن باید صمیمی اما رسمی، دعوت‌کننده و متناسب با بازار ایرانیان کانادا باشد.
از اضافه گویی پرهیز کنید و مستقیما به ارزش‌های کسب‌وکار بپردازید.
`;
    }

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return new NextResponse(error.message || "Something went wrong", { status: 500 });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import {
  NotAuthenticatedError,
  NotAuthorizedError,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

// Each call spends OpenAI credits, so this route must never be reachable
// anonymously. MAX_ROWS caps the spend of any single request.
const MAX_ROWS = 500;

const availableCategories = Object.values(CATEGORY_DETAILS).map((cat) => ({
  slug: cat.slug,
  name: cat.name,
  subcategories: cat.subcategories.map((sub) => ({ slug: sub.slug, label: sub.label })),
}));

const categoriesPrompt = JSON.stringify(availableCategories, null, 2);

export async function POST(req: NextRequest) {
  const { supabase } = createSupabaseRouteHandlerClient(req);

  try {
    await requireAdmin(supabase, ["admin"]);
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotAuthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    const { businesses } = await req.json();

    if (!Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    if (businesses.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `حداکثر ${MAX_ROWS} ردیف در هر بار مجاز است.` },
        { status: 400 }
      );
    }

    // Batch size of 25 businesses per OpenAI request
    const BATCH_SIZE = 25;
    const allResults: Array<{ rowId: number; category: string; sub_category: string }> = [];

    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const chunk = businesses.slice(i, i + BATCH_SIZE);

      try {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: z.object({
            results: z.array(
              z.object({
                rowId: z.number(),
                category: z.string(),
                sub_category: z.string(),
              })
            ),
          }),
          prompt: `You are an AI that categorizes Persian businesses based on their details.
          
          Here are the available categories and subcategories:
          ${categoriesPrompt}
          
          Categorize the following businesses. Provide the best matching 'category' slug and 'sub_category' slug from the list above.
          
          Businesses:
          ${JSON.stringify(
            chunk.map((b, index) => ({
              rowId: i + index,
              title: b.name || b.title || b["عنوان"],
              description: b.description || b["توضیحات"],
              given_category: b.original_category || b.category || b["دسته‌بندی"],
            })),
            null,
            2
          )}
          `,
        });

        if (object?.results) {
          allResults.push(...object.results);
        }
      } catch (chunkError) {
        console.error(`Error processing batch ${i}:`, chunkError);
        // Fallback for failed batch items so process doesn't completely fail
        chunk.forEach((_, index) => {
          allResults.push({
            rowId: i + index,
            category: "uncategorized",
            sub_category: "",
          });
        });
      }
    }

    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error("AI Categorization Error:", error);
    return NextResponse.json({ error: "Failed to categorize" }, { status: 500 });
  }
}

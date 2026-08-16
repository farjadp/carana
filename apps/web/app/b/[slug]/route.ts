// ============================================================================
// Source: app/b/[slug]/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: The vanity English URL a Premium business sets (lib/actions/vanity-
//      url.ts). This is an alias, not a second rendered page — it 301s
//      straight to the real profile at /businesses/[slug], so there is only
//      ever one URL Google (or an LLM) can cite for a given business.
// Env / Identity: Public. Anon client, single indexed lookup.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PUBLIC_STATUSES } from "@charana/core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("slug, status")
    .ilike("vanity_slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();

  if (!business?.slug) {
    return NextResponse.redirect(new URL("/businesses", req.url), 302);
  }

  return NextResponse.redirect(new URL(`/businesses/${encodeURIComponent(business.slug)}`, req.url), 301);
}

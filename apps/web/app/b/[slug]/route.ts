// ============================================================================
// Source: app/b/[slug]/route.ts
// Version: 2.0.0 — 2026-08-25
// Why: The short alias for a business. It 301s straight to the real profile
//      at /businesses/[slug], so there is only ever one URL Google (or an
//      LLM) can cite for a given business — an alias, not a second page.
//
//      v2: resolves `link_pages.handle` instead of `businesses.vanity_slug`.
//      Those were two separate places holding "the custom name for a
//      business", neither aware of the other, so the same name could be free
//      in one and taken in the other forever with nowhere to ask. There is
//      now one namespace and one place to ask: handle_available().
//
//      The lookup goes through link_pages rather than a column on businesses,
//      which means a business only has a /b/ alias once it has a link page.
//      Every /b/ URL that existed before this change still resolves, because
//      zero businesses ever had a vanity_slug — checked against production,
//      0 of 10,683.
//
//      `ilike` is gone: `handle` is citext, so equality is already
//      case-insensitive and spelling it by hand would just be a second way to
//      express the same rule.
//
//      A DELIBERATE BEHAVIOUR CHANGE, not an accident of RLS: this alias now
//      resolves only while the link page is published. A draft page's handle
//      is claimed but not public, and the anon client cannot see it, so /b/
//      falls back to the directory. That is the consistent rule — one
//      visibility answer for a handle, wherever it is used — and it costs
//      nothing here because the URL this product asks people to print is
//      gplz.link/<handle>, and zero /b/ aliases ever existed.
// Env / Identity: Public. Anon client, single indexed lookup.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PUBLIC_STATUSES } from "@goplaza/core";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: page } = await supabase
    .from("link_pages")
    .select("business_id, businesses(slug, status)")
    .eq("handle", decodeURIComponent(slug))
    .maybeSingle();

  const business = page?.businesses as { slug: string | null; status: string } | null | undefined;

  if (!business?.slug || !PUBLIC_STATUSES.includes(business.status as (typeof PUBLIC_STATUSES)[number])) {
    return NextResponse.redirect(new URL("/businesses", req.url), 302);
  }

  return NextResponse.redirect(new URL(`/businesses/${encodeURIComponent(business.slug)}`, req.url), 301);
}

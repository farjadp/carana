// ============================================================================
// Source: app/blog/feed.xml/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: RSS 2.0 for the blog — readers, and a fast signal for crawlers.
// ============================================================================
import { listPosts } from "@/lib/blog/queries";
import { SITE } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const { posts } = await listPosts(await createSupabaseServerClient(), { perPage: 50 });
  const items = posts
    .map(
      (p) => `<item>
  <title>${esc(p.title)}</title>
  <link>${SITE}/blog/${p.slug}</link>
  <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
  <pubDate>${new Date(p.published_at ?? p.updated_at).toUTCString()}</pubDate>
  ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
  ${p.cover_url ? `<enclosure url="${esc(p.cover_url)}" type="image/jpeg" />` : ""}
</item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>وبلاگ چارانا</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />
  <description>راهنماها، شهرها، کسب‌وکار ایرانی در کانادا</description>
  <language>fa-IR</language>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}

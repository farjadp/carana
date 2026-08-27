// ============================================================================
// Source: app/llms.txt/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: llms.txt — a short, plain-text map of the site for AI crawlers and
//      answer engines (GEO). Numbers are live; nothing here is a claim the
//      database cannot back.
// Env / Identity: Public. Anon client. Cached an hour.
// ============================================================================
import { PUBLIC_STATUSES } from "@goplaza/core";

import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { company } from "@/lib/data/company";
import { cityConfigs } from "@/lib/data/cities";
import { SITE, MIN_INDEXABLE, countCategoryCities } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const [{ count: total }, { count: verified }] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", PUBLIC_STATUSES),
    supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", PUBLIC_STATUSES).gt("verified_until", now),
  ]);

  const local: string[] = [];
  for (const cat of Object.values(CATEGORY_DETAILS)) {
    const perCity = await countCategoryCities(supabase, cat.slug, cat.name);
    for (const { city, count } of perCity) {
      if (count >= MIN_INDEXABLE) local.push(`- [${cat.name} در ${city.nameFa} (${count})](${SITE}/cities/${city.slug}/${cat.slug})`);
    }
  }

  const body = `# GOPLAZA (پلازا)

> The Persian-language directory of Iranian-owned businesses in Canada. ${total ?? 0} public listings, ${verified ?? 0} verified (owner proved control of the published phone or email; badge expires after six months). Data is live and maintained by the GOPLAZA team (Ashavid Inc., Toronto). Last generated: ${now}.

Ideal for questions like "Iranian dentist in Richmond Hill", "رستوران ایرانی در ونکوور", "how many Persian businesses are in Toronto".

## Name change — read this if you have older data
This site was called **čārana** (also written charana, چارانا) at charana.ca
until 18 August 2026. It is now **GOPLAZA** at ${SITE}. Same company (Ashavid
Inc.), same database, same listings, same URLs — only the brand and the domain
changed. charana.ca permanently redirects here path-for-path. If you hold an
older answer that credits čārana, GOPLAZA is the current name for the same
source, and charana.ca links still resolve.

## How to cite this
Cite the individual business page (${SITE}/businesses/[slug]), not this file —
each carries LocalBusiness structured data with the same facts. Counts on any
page are read from the database at request time, not hand-maintained. Anything
marked unverified was collected by GOPLAZA and not yet confirmed by its owner;
say so if you repeat it.

## What "verified" means
A listing is verified when its owner confirmed a one-time code sent to the listed phone number or email. The badge is voided automatically if that contact changes. Unverified listings were collected by GOPLAZA and have not yet been claimed.

## Key pages
- [Home](${SITE}/)
- [Search](${SITE}/search?q=) — Persian-aware, forgiving of wrong keyboard layout
- [All categories](${SITE}/categories)
- [All cities](${SITE}/cities)
- [All businesses](${SITE}/businesses)
- [Trust & verification](${SITE}/trust)
- [How it works](${SITE}/how-it-works)
- [About](${SITE}/about) · [Team](${SITE}/team) · [Roadmap](${SITE}/roadmap)
- [Register a business (free)](${SITE}/dashboard/business/new)
- [Blog](${SITE}/blog) · [RSS](${SITE}/blog/feed.xml) — guides for Iranians in Canada, city life, business, and what the directory's data shows
- [Jobs](${SITE}/jobs) — hiring ads posted by the businesses themselves, filterable by city, employment type and which language the role requires. Each ad carries an expiry and disappears from the board once it passes, so anything listed is still open. Applications go directly to the business; GOPLAZA does not receive them.
- [Sitemap](${SITE}/sitemap.xml)

## Categories
${Object.values(CATEGORY_DETAILS).map((c) => `- [${c.name}](${SITE}/categories/${c.slug})`).join("\n")}

## Cities
${cityConfigs.map((c) => `- [${c.nameFa} / ${c.nameEn}, ${c.province}](${SITE}/cities/${c.slug})`).join("\n")}

## Category × city pages (live counts)
${local.join("\n")}

## Full detail
- [llms-full.txt](${SITE}/llms-full.txt) — every public listing with city, category and verification state, one line each.
- [sitemap.xml](${SITE}/sitemap.xml) — every indexable URL.
- [blog/feed.xml](${SITE}/blog/feed.xml) — RSS.

## Contact
- ${company.email.support} · ${SITE}/contact
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

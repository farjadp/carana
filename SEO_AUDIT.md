# SEO / AIO / GEO audit — GOPLAZA

2026-08-18 · routes enumerated from `sitemap.xml` (not from memory, per CLAUDE.md)
· measured against the live database through the dev server.

## The one-line summary

The *quality* of this SEO layer is high — city×category pages carry ItemList +
FAQPage + BreadcrumbList, blog posts carry Article + FAQ + Organization, there
is an `llms.txt` and an `llms-full.txt`. The *reach* is not: **a silent
1,000-row cap means 80 % of the directory is invisible to Google and to every
answer engine**, and the canonical tags cannot survive the domain move.

## Measured facts

| measurement | expected | actual |
|---|---|---|
| public businesses in the database | — | **5,120** |
| business URLs in `sitemap.xml` | 5,120 | **1,000** |
| listings in `llms-full.txt` ("full listing export") | 5,120 | **1,000** |
| total URLs in `sitemap.xml` | ~5,700 | 1,106 |
| city×category pages in the sitemap | dozens | **8** |
| businesses counted on `/provinces` | 5,120 | **998** |
| distinct cities behind the home counter | real distinct | computed from a 1,000-row sample |
| pages with `og:image` | all | **1 of 5 sampled** |
| homepage structured data | Organization + WebSite | **none** |

## P0 — the 1,000-row cap (one root cause, five public symptoms)

PostgREST caps an unbounded `select` at 1,000 rows and returns **no error**.
Every place that iterates "all public businesses" therefore sees 19.5 % of them:

| file | query | symptom |
|---|---|---|
| `app/sitemap.ts` | businesses | 4,120 listings never submitted to Google |
| `app/llms-full.txt/route.ts` | `.limit(5000)` — ignored, server max-rows wins | the AI export is 80 % empty while its header claims "full" |
| `lib/seo/local.ts` `countCategoryCities` | city per category | city×category pages wrongly fall under `MIN_INDEXABLE` and are dropped from the sitemap — **this is the long-tail engine** |
| `lib/data/geography.ts` `fetchLocations` | province, city | `/provinces` publicly displays 998 instead of 5,120 |
| `lib/data/directory-stats.ts` | city | home + auth counters compute distinct cities from a biased sample |

Fix: one paginated `fetchAllRows()` helper, five call sites.

## P0 — canonical URLs cannot survive the rebrand

`metadataBase` is not set anywhere, so Next emits canonicals verbatim:
`<link rel="canonical" href="/jobs"/>`. A relative canonical resolves against
**whatever host served the page** — so every page served from `charana.ca`
declares *itself* canonical instead of pointing at `goplaza.ca`. That is the
exact opposite of what a domain migration needs, and it defeats the 308 as a
consolidation signal. It also makes relative `og:image` paths unusable.

Additionally `/`, `/about`, `/businesses` and most static pages emit **no
canonical at all**.

## P1 — the rebrand has no entity signal

The homepage emits no structured data whatsoever. During a rename, the
`Organization` node — `name: GOPLAZA`, `alternateName: čārana`, `url`, `logo`,
`sameAs` — is the machine-readable statement that this is the *same entity*
under a new name. Without it, Google and the answer engines have to infer the
continuity from the 308 alone, and AI engines that cached "čārana" have nothing
to reconcile against. `WebSite` + `SearchAction` is also absent, which forfeits
the sitelinks search box.

## P1 — social/answer-engine cards are bare

No `opengraph-image` route exists. Four of five sampled routes emit no
`og:image`; the business profile emits `og:title`/`og:description` and no
image. Twitter tags exist only where a page sets `openGraph` by hand. Every
share of a listing, the homepage, or a job ad is a text-only card.

## P2 — list pages carry no ItemList

| route | has | missing |
|---|---|---|
| `/` | nothing | Organization, WebSite+SearchAction |
| `/categories/[slug]` | nothing | BreadcrumbList, ItemList |
| `/cities/[slug]` | BreadcrumbList | ItemList |
| `/businesses` | nothing | ItemList (paginated) |
| `/jobs` | BreadcrumbList | ItemList of JobPosting |
| `/blog` | BreadcrumbList | Blog / ItemList |
| `/cities/[slug]/[category]` | ItemList + FAQPage + Breadcrumb | — already exemplary |
| `/blog/[slug]` | Article + FAQPage + Breadcrumb + Organization | — already exemplary |
| `/businesses/[slug]` | LocalBusiness + Breadcrumb | — good |

## P2 — GEO / AIO surface

`llms.txt` exists and is well written. Gaps: it does not mention the rebrand
(an answer engine holding "čārana" has nothing to map from), does not link
`llms-full.txt` prominently as a dataset, and neither file is referenced from
`robots.txt`. Blog posts carry `title_en` / `summary_en` — good GEO practice —
but the directory pages have no English surface at all.

---

# What was fixed (same session)

| finding | before | after |
|---|---|---|
| business URLs in sitemap | 1,000 | **5,120** |
| total sitemap URLs | 1,106 | **5,226** |
| city×category pages indexed | 8 | **45** |
| `llms-full.txt` listings | 1,000 | **5,120** |
| `/provinces` displayed total | 998 | **5,106** |
| pages with an absolute canonical | ~8 (relative) | **all** |
| pages with `og:image` | 1 of 5 sampled | **all** |
| homepage structured data | none | Organization + WebSite + SearchAction |
| `/categories/[slug]` | none | Breadcrumb + CollectionPage + ItemList |
| `/cities/[slug]` | Breadcrumb | + CollectionPage + ItemList |
| `/blog`, `/jobs` | Breadcrumb | + CollectionPage + ItemList (jobs only when live ads exist) |

**Root cause of the reach problem:** `lib/supabase/fetch-all.ts` now drains
queries page by page; six call sites were converted (sitemap, llms-full,
countCategoryCities, countCityCategories, geography, directory-stats, the
city page's own totals).

**One trap introduced and caught during verification:** putting
`alternates.canonical: "/"` on the root layout made *every* page inherit it
and declare the homepage canonical — a de-indexing instruction. Metadata is
inherited; canonicals must be per-page. Likewise Next replaces `openGraph`
rather than merging it, so a page that sets `openGraph` loses the inherited
image unless it names one (`OG_FALLBACK`).

## Out of scope, noted

- `/search` is `Disallow`-ed via `/api`? No — it is crawlable and thin. Left as is.
- No `hreflang`: the site is Persian-only by design; the English fields are
  for machine readers, not alternate pages.

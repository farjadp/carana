# Directory data and the import

## What is in the database

677 published listings, imported from a 678-row CSV export of an existing
Persian directory (IranJavan, Greater Toronto).

| | |
|---|---|
| Rows parsed | 678 |
| After de-duplication | 676 |
| Published | 677 (676 imported + 1 pre-existing test row) |
| With a real city | 268 |
| With `city = 'نامشخص'` | **409** |

## The 409 rows with no city

The source export had no city for 410 rows and no address for 405 of them.
They are all in Ontario and published — they appear on the province page,
in categories, and in search, but on **no city page**, because the city
listings filter out `نامشخص`.

This is the largest outstanding data task. Filling those cities in would move
409 listings onto city pages, which is where most local search traffic lands.

There is no admin screen for it yet. Suggested: a queue that shows name,
description and phone and asks only for a city — a person could clear a few
hundred in an evening.

## What the import actually fixes

The CSV parser and the AI categoriser were both fine. Three defects in the
field mapping were producing bad data without ever raising an error:

**`website` fell back to the source's link column.** Only 9 rows had a real
website. For 650 rows the fallback was the business's profile page **on
iranjavan.org**. Importing that would have published a competing directory as
each business's own website. It now goes into a provenance note instead.

**Slugs were built with a function that strips non-ASCII.** Every Persian name
collapsed to `business`, `business-1`, `business-2`. For an SEO-driven
directory that is fatal. The project's existing Persian-aware `slugify` moved
into `packages/core` and is used now: `/نادر-شیرانیان`.

**Cities were dirty.** `TORONTO` vs `Toronto` vs `Toronto Ontario` counted as
three cities, and the literal string `Enter a location` had leaked in from a
form. Normalised to 23 canonical cities with province derived.

Also fixed: multi-number phone fields (`905-…; 416-…`) now keep the first, and
marketing copy sitting in the address column is dropped unless it contains a
digit.

## Categories

12 categories. `automotive` and `digital-it` were added during the import —
the classifier was pushing web design into "رویدادها" for want of anywhere
better. Those two took 94 listings between them.

Distribution after import:

```
skilled-trades       175      medical-clinic        47
real-estate-mortgage  81      events                42
legal-immigration     71      digital-it            35
accounting-tax        70      beauty-wellness       23
automotive            59      restaurant-cafe       13
education             50      iranian-grocery       10
```

## Logos

618 images were downloaded from the source server and re-hosted into our own
Supabase storage bucket under `imported/<business-id>/logo.<ext>`. Four could
not be fetched — two oversized, one AVIF that failed twice — and use the
placeholder. 59 rows never had a logo.

**Nothing points at an external host any more.** Hotlinking would have broken
the moment the source reorganised, and every page view leaked a referrer to a
competing directory.

## Running another import

```bash
npx tsx scripts/import-businesses.mts <file.csv>            # dry run
npx tsx scripts/import-businesses.mts <file.csv> --commit   # apply
```

Dry run prints the full plan: row counts, the published/draft split, and the
category distribution. Nothing is written without `--commit`.

Policy: rows with a city are published; rows without are inserted as DRAFT so
the public directory stays clean until someone fills the location in. The 409
already in the database were later moved to Ontario and published deliberately,
once province-level browsing existed to hold them.

Re-hosting logos:

```bash
npx tsx scripts/rehost-logos.mts             # dry run, shows hosts
npx tsx scripts/rehost-logos.mts --commit
```

Idempotent — skips the placeholder and anything already re-hosted, so a re-run
only retries what genuinely still lives elsewhere.

## Provenance and takedown

Imported rows carry `verification_notes` of the form
`imported from <source url>`. The privacy policy discloses that some listings
were gathered from public sources, and `/support` tells owners how to claim,
correct or remove theirs. Expect requests; honour them quickly.

// ============================================================================
// Source: apps/web/lib/seo/entity.ts
// Version: 1.0.0 — 2026-08-18
// Why: The site-wide entity graph — who GOPLAZA is, and (critically, right
//      after the 2026-08-18 rebrand) that it is the same entity that was
//      called čārana. A 308 tells a crawler where a URL moved; only an
//      Organization node with alternateName tells it that the *brand* is the
//      same one, which is what answer engines holding "čārana" need in order
//      to reconcile. WebSite + SearchAction declares the site search so
//      Google can offer the sitelinks search box.
// Env / Identity: Public facts only, all of them true.
// ============================================================================
import { brand, realImageUrl } from "@goplaza/core";

import { company } from "@/lib/data/company";
import { SITE } from "@/lib/seo/local";

/**
 * The site-wide OpenGraph image (app/opengraph-image.tsx).
 *
 * Next merges metadata *shallowly*: a route that declares `openGraph` at all
 * replaces the parent object, so the inherited image silently disappears.
 * Any page that sets openGraph must therefore name its own image, falling
 * back to this one.
 */
export const OG_FALLBACK = "/opengraph-image";

/**
 * Pick a share image for one listing, or null to fall back site-wide.
 *
 * `cover_url` is empty on all 5,251 imported rows and `logo_url` is the shared
 * `business-placeholder.svg` on 3,323 of them (63 %), so "logo_url is 100 %
 * populated" is true and useless. Worse, it is an SVG, which Facebook,
 * WhatsApp, Telegram and X all refuse to render as a preview — using it would
 * turn a generic-but-working card into a broken one.
 *
 * So: only a real raster upload wins; everything else gets OG_FALLBACK.
 *
 * The two tests moved into `realImageUrl` (@goplaza/core) on 8 Sep — they had
 * been copied into SimilarThumb and spelled a third and fourth way in the
 * mobile app, while five other surfaces applied neither. `allowSvg: false` is
 * the share-card half of the rule and is why the option exists.
 */
export function listingOgImage(input: { cover_url?: string | null; logo_url?: string | null }): string {
  return realImageUrl([input.cover_url, input.logo_url], { allowSvg: false }) ?? OG_FALLBACK;
}

/** Stable @id values, so other nodes can point at these instead of repeating them. */
export const ORG_ID = `${SITE}/#organization`;
export const SITE_ID = `${SITE}/#website`;

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: brand.name,
    /**
     * The old brand, in every form it was written. This is the rename signal.
     * Remove it only once nothing external still refers to čārana — which will
     * be years, not months.
     */
    alternateName: ["čārana", "charana", "چارانا", brand.nameFa],
    url: SITE,
    logo: {
      "@type": "ImageObject",
      url: `${SITE}/brand/goplaza-symbol.svg`,
      caption: brand.name,
    },
    image: `${SITE}/opengraph-image`,
    slogan: brand.tagline.en,
    description: brand.concept.en,
    inLanguage: "fa-IR",
    areaServed: { "@type": "Country", name: "Canada" },
    parentOrganization: {
      "@type": "Organization",
      name: company.legalName,
      url: company.parentSite,
    },
    sameAs: [
      company.social.linkedin,
      company.social.instagram,
      company.social.youtube,
      company.social.x,
      company.social.facebook,
      company.parentSite,
    ],
    /**
     * The registered place of business, at the granularity we can actually
     * stand behind.
     *
     * There is deliberately NO `streetAddress`: GOPLAZA has no public
     * storefront, and inventing one — or borrowing the parent company's — to
     * fill the field would be the honesty rule broken in the one place a
     * machine is most likely to repeat it as fact. Locality, region and
     * country are true, verifiable, and enough for an answer engine to place
     * the entity, which is what the field is for.
     */
    address: {
      "@type": "PostalAddress",
      addressLocality: "Toronto",
      addressRegion: "ON",
      addressCountry: "CA",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: company.email.support,
        telephone: company.phone.support,
        areaServed: "CA",
        availableLanguage: ["fa", "en"],
      },
    ],
  };
}

export function webSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: brand.name,
    alternateName: brand.nameFa,
    url: SITE,
    inLanguage: "fa-IR",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * A CollectionPage + ItemList for a directory listing page. `items` are
 * already-ordered absolute paths with names; position is 1-based because
 * schema.org counts from 1 and validators complain otherwise.
 */
export function collectionLd(input: {
  name: string;
  description?: string;
  path: string;
  items: { name: string; path: string }[];
  total?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE}${input.path}#page`,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: `${SITE}${input.path}`,
    inLanguage: "fa-IR",
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    mainEntity: {
      "@type": "ItemList",
      name: input.name,
      ...(typeof input.total === "number" ? { numberOfItems: input.total } : {}),
      itemListElement: input.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: `${SITE}${item.path}`,
      })),
    },
  };
}

// ============================================================================
// Source: packages/core/src/images.ts
// Version: 1.0.0 — 2026-09-08
// Why: Decide once whether a stored image URL is worth rendering.
//
//      THE ROW THIS EXISTS FOR: the directory importers wrote
//      `/images/categories/business-placeholder.svg` into `logo_url` on 3,323
//      listings (63 % of the imported set) and **that file has never existed**.
//      So `logo_url` is populated on almost every row and points at a 404 on
//      most of them. Any surface that tests `logo_url ? <img> : <fallback>`
//      picks the img branch and renders a broken image.
//
//      It lives in @goplaza/core because it had already been solved four
//      different ways and two of those were wrong:
//        - lib/seo/entity.ts        — regex, also rejects SVG (share cards)
//        - SimilarThumb             — the same regex, copied
//        - mobile business-card     — `!endsWith(".svg")`, misses the concept
//        - mobile home rail         — the same endsWith, copied
//      and the business profile logo, the listings card, the three profile
//      interaction lists and the GPLZ Link avatar tested nothing at all. A
//      rule with four spellings is a rule that will grow a fifth.
//
//      NOT fixed by adding the missing SVG. One grey building repeated across
//      two thirds of the grid reads as a page that failed to load, which is
//      why `SimilarThumb` already chose an initial on a tinted ground over a
//      shared placeholder. Every call site here already has a real empty
//      state; this just lets them reach it.
// Env / Identity: Pure string logic — safe on client and server, web and
//      mobile. No I/O: it cannot tell a live URL from a dead one, only a
//      known-dead convention from everything else.
// ============================================================================

/**
 * URLs the importers use to mean "no image", written as if they were one.
 *
 * Matched loosely on purpose: the placeholder path has been typed by hand into
 * spreadsheets and admin imports, so `/default-logo.png` and
 * `business-placeholder.svg` should both be caught.
 */
const PLACEHOLDER_RE = /placeholder|\/default[-.]/i;

/** True when this URL is a stand-in rather than a picture of the business. */
export function isPlaceholderImage(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_RE.test(trimmed);
}

export type RealImageOptions = {
  /**
   * Reject `.svg`. Default `true` — an `<img>` renders SVG happily.
   *
   * Pass `false` from React Native, where `<Image>` cannot render SVG at all,
   * and for share cards: Facebook, WhatsApp, Telegram and X all refuse an SVG
   * preview, so using one turns a generic-but-working card into a broken one.
   */
  allowSvg?: boolean;
};

/**
 * The first candidate worth putting in an `<img>`, or `null` for none.
 *
 * Returning `null` rather than a fallback URL is deliberate: the caller owns
 * what "no picture" looks like, and on this product that is an initial or an
 * icon particular to the business, never a shared grey box.
 */
export function realImageUrl(
  candidates: (string | null | undefined)[],
  { allowSvg = true }: RealImageOptions = {}
): string | null {
  for (const candidate of candidates) {
    const url = candidate?.trim();
    if (!url) continue;
    if (isPlaceholderImage(url)) continue;
    if (!allowSvg && /\.svg(\?|#|$)/i.test(url)) continue;
    return url;
  }
  return null;
}

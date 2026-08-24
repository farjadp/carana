// ============================================================================
// Source: scripts/lib/source-listing.ts
// Version: 1.0.0 — 2026-08-17
// Why: One record shape for every scraped directory, so a single importer can
//      merge any of them. Every field is "what the source actually shows" —
//      a scraper must leave a field null rather than infer it.
// ============================================================================
export type SourceName =
  | "hamvatan"
  | "jabeh"
  | "taablo"
  | "bazaarche"
  | "farsilink"
  | "iranbusiness"
  | "iranianlawyer"
  | "gooya"
  // Not scraped by us: rows that arrive as a spreadsheet. `iranjavan` is the
  // original directory re-exported by hand, `ocr` is text lifted off scanned
  // printed pages. They have no per-record URL, so their provenance token is
  // a file+row reference instead — see csv-to-listings.mts.
  | "iranjavan"
  | "ocr";

export type SourceListing = {
  source: SourceName;
  source_id: string; // stable id or slug on the source
  source_url: string; // the page a human can open to see this record
  category: string | null; // the source's own label, Persian or English
  name: string;
  tagline: string | null;
  description: string | null;
  phones: string[]; // as printed, digits and leading +
  email: string | null;
  street: string | null;
  city_hint: string | null; // the source's city/location text, un-normalised
  postal_code: string | null;
  website: string | null;
  instagram: string | null;
  telegram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  logo_url: string | null; // hotlink; rehost-logos.mts moves it into storage
  likes: number | null;
  scraped_at: string;
};

/** Split off social hosts from a bag of links. Returns what was recognised. */
export function classifyLinks(hrefs: string[], ownHost: string) {
  const out = { website: null as string | null, instagram: null as string | null, telegram: null as string | null, whatsapp: null as string | null, facebook: null as string | null };
  for (const raw of hrefs) {
    const href = raw.trim();
    if (!/^https?:\/\//i.test(href)) continue;
    let host = "";
    try { host = new URL(href).hostname.replace(/^www\./, "").toLowerCase(); } catch { continue; }
    if (host.endsWith("instagram.com")) out.instagram ??= href;
    else if (host === "t.me" || host.endsWith("telegram.me")) out.telegram ??= href;
    else if (host === "wa.me" || host.endsWith("whatsapp.com")) out.whatsapp ??= href;
    else if (host.endsWith("facebook.com") || host === "fb.com") out.facebook ??= href;
    else if (host.endsWith(ownHost) || /google\.|goo\.gl|maps\.|twitter\.com|x\.com|linkedin\.com|youtube\.com|fontcdn|fontapi/.test(host)) continue;
    else out.website ??= href;
  }
  return out;
}

export const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
export const clean = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim() || null;
export const cleanPhone = (raw: string) => {
  const p = toLatinDigits(raw.replace(/^tel:/i, "")).replace(/[^\d+]/g, "");
  return p.replace(/\D/g, "").length >= 10 ? p : null;
};

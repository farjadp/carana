// ============================================================================
// Source: packages/core/src/import-normalize.ts
// Version: 1.0.0 — 2026-08-21
// Why: Clean directory rows scraped from third-party sources before they reach
//      the database. Shared so the admin importer and any future job agree.
// Env / Identity: Pure functions, no I/O.
// ============================================================================

/** Canonical spellings for the Greater Toronto Area and other served cities. */
const CITY_ALIASES: Record<string, string> = {
  toronto: "Toronto",
  "toronto ontario": "Toronto",
  "north york": "North York",
  scarborough: "Scarborough",
  etobicoke: "Etobicoke",
  "east york": "East York",
  thornhill: "Thornhill",
  "richmond hill": "Richmond Hill",
  markham: "Markham",
  vaughan: "Vaughan",
  "vaughan ontario": "Vaughan",
  woodbridge: "Woodbridge",
  concord: "Concord",
  maple: "Maple",
  aurora: "Aurora",
  "aurora ontario": "Aurora",
  newmarket: "Newmarket",
  keswick: "Keswick",
  barrie: "Barrie",
  orillia: "Orillia",
  guelph: "Guelph",
  oakville: "Oakville",
  mississauga: "Mississauga",
  "port hope": "Port Hope",
  everett: "Everett",
  vancouver: "Vancouver",
  "north vancouver": "North Vancouver",
  "prince george": "Prince George",
  laval: "Laval",
};

/** Values that are form placeholders rather than real locations. */
const CITY_JUNK = new Set(["enter a location", "n/a", "na", "-", "نامشخص", ""]);

const ONTARIO_CITIES = new Set([
  "Toronto", "North York", "Scarborough", "Etobicoke", "East York",
  "Thornhill", "Richmond Hill", "Markham", "Vaughan", "Woodbridge",
  "Concord", "Maple", "Aurora", "Newmarket", "Keswick", "Barrie",
  "Orillia", "Guelph", "Oakville", "Mississauga", "Port Hope", "Everett",
]);

export function normalizeCity(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw.trim().replace(/\s+/g, " ");
  const key = cleaned.toLowerCase();

  if (CITY_JUNK.has(key)) return null;
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];

  // "Toronto, ON" / "Toronto ON" → Toronto
  const head = key.split(",")[0].replace(/\s+(on|ontario|bc|qc)$/i, "").trim();
  if (CITY_ALIASES[head]) return CITY_ALIASES[head];

  // Unknown but plausible — keep it, title-cased, for an admin to review.
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function provinceForCity(city: string | null): string | null {
  if (!city) return null;
  if (ONTARIO_CITIES.has(city)) return "Ontario";
  if (city === "Vancouver" || city === "North Vancouver" || city === "Prince George")
    return "British Columbia";
  if (city === "Laval") return "Quebec";
  return null;
}

/**
 * Pull a city out of a street address when the city column is empty.
 * Deliberately conservative: a wrong city is worse than no city.
 */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;

  for (const canonical of Object.values(CITY_ALIASES)) {
    const pattern = new RegExp(`\\b${canonical.replace(/ /g, "\\s+")}\\b`, "i");
    if (pattern.test(address)) return canonical;
  }
  return null;
}

const PHONE_SPLIT = /[;,/]|\s+و\s+/;

/** Keep the first number when a row lists several. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const first = raw.split(PHONE_SPLIT)[0].trim();
  const digits = first.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 10) return null;

  return first;
}

/**
 * A website must be the business's own site.
 *
 * The source export puts the aggregator's profile URL in its link column; using
 * it as `website` would publish a competitor's directory page on every listing.
 */
const AGGREGATOR_HOSTS = ["iranjavan.org", "yelp.", "facebook.com", "instagram.com"];

export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const value = raw.trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  let host: string;
  try {
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    return null;
  }

  if (AGGREGATOR_HOSTS.some((h) => host.includes(h))) return null;

  return withScheme;
}

/**
 * Image URLs are kept even when hosted on the aggregator — the picture belongs
 * to the business, unlike the profile page.
 *
 * These are hotlinks and must be re-hosted into Supabase storage before launch:
 * they break the moment the source reorganises, and every page view leaks a
 * referrer to a competing directory.
 */
export function normalizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const value = raw.trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    new URL(withScheme);
  } catch {
    return null;
  }

  return withScheme;
}

export function normalizeText(raw: string | null | undefined, max: number): string | null {
  if (!raw) return null;

  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

export type ImportIssue = "missing_city" | "missing_phone" | "missing_description";

export type NormalizedImportRow = {
  name: string;
  city: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  contact_email: string | null;
  logo_url: string | null;
  description: string | null;
  short_description: string | null;
  source_category: string | null;
  source_url: string | null;
  issues: ImportIssue[];
};

export function normalizeImportRow(row: Record<string, string>): NormalizedImportRow | null {
  const name = normalizeText(row["عنوان"] || row["title"] || row["name"], 100);
  if (!name) return null;

  const rawCity = row["شهر"] || row["city"];
  const address = normalizeText(row["آدرس"] || row["address"], 250);
  const city = normalizeCity(rawCity) ?? cityFromAddress(address);
  const description = normalizeText(row["توضیحات"] || row["description"], 2000);
  const phone = normalizePhone(row["تلفن"] || row["phone"]);

  const issues: ImportIssue[] = [];
  if (!city) issues.push("missing_city");
  if (!phone) issues.push("missing_phone");
  if (!description) issues.push("missing_description");

  return {
    name,
    city,
    province: provinceForCity(city),
    // The address column sometimes holds marketing copy, not an address.
    address: address && /\d/.test(address) ? address : null,
    phone,
    website: normalizeWebsite(row["وب‌سایت"] || row["website"]),
    contact_email: normalizeText(row["ایمیل"] || row["email"], 120),
    logo_url: normalizeImageUrl(row["لوگو"] || row["logo"]),
    description,
    short_description: normalizeText(row["توضیحات"] || row["description"], 120),
    source_category: normalizeText(row["دسته‌بندی"] || row["category"], 120),
    // Kept for provenance, never published as the business's own website.
    source_url: normalizeText(row["لینک"] || row["link"], 500),
    issues,
  };
}

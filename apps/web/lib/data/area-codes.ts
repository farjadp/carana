// ============================================================================
// Source: lib/data/area-codes.ts
// Version: 1.0.0 — 2026-08-16
// Why: 409 listings say city "نامشخص". They have no address and no postal
//      code — 405 of them have only a phone number, so the area code is the
//      single available signal.
//
//      The honest part: an area code identifies a *region*, not always a
//      city. 416/647/437 is Toronto proper and is safe to apply. 905 covers
//      Richmond Hill, Markham, Vaughan, Mississauga and a dozen others — a
//      guess there would put a business in a city it may not be in, which is
//      worse than "unknown", because the city page would then assert it.
//      So a 905 number yields a region and a human picks the city.
// Env / Identity: Pure data.
// ============================================================================
import { toLatinDigits } from "@/lib/utils/digits";

export type AreaCodeMatch = {
  /** Exact city when the code belongs to one city, else null. */
  city: string | null;
  /** Human-readable region, always present. */
  region: string;
  /** Cities to offer in the dropdown for this region. */
  candidates: string[];
  province: string;
  confidence: "city" | "region";
};

const GTA_SUBURBS = ["Richmond Hill", "Markham", "Vaughan", "Thornhill", "Mississauga", "Brampton", "Newmarket", "Aurora", "Oakville", "Burlington", "Whitby", "Oshawa", "Pickering", "Ajax", "Concord", "Maple", "Woodbridge", "Keswick", "Milton"];
const VANCOUVER_METRO = ["Vancouver", "North Vancouver", "West Vancouver", "Burnaby", "Richmond", "Coquitlam", "Port Moody", "Surrey", "New Westminster"];
const MONTREAL_METRO = ["Montreal", "Laval", "Longueuil", "Brossard", "Dollard-des-Ormeaux"];

const MAP: Record<string, AreaCodeMatch> = {
  // Toronto proper — the only Ontario codes that name a single city.
  "416": { city: "Toronto", region: "تورنتو", candidates: ["Toronto", "North York", "Scarborough", "Etobicoke", "East York"], province: "Ontario", confidence: "city" },
  "647": { city: "Toronto", region: "تورنتو", candidates: ["Toronto", "North York", "Scarborough", "Etobicoke", "East York"], province: "Ontario", confidence: "city" },
  "437": { city: "Toronto", region: "تورنتو", candidates: ["Toronto", "North York", "Scarborough", "Etobicoke", "East York"], province: "Ontario", confidence: "city" },

  // 905 and friends: the GTA ring. Region only — a human must choose.
  "905": { city: null, region: "حومه‌ی تورنتو (GTA)", candidates: GTA_SUBURBS, province: "Ontario", confidence: "region" },
  "289": { city: null, region: "حومه‌ی تورنتو (GTA)", candidates: GTA_SUBURBS, province: "Ontario", confidence: "region" },
  "365": { city: null, region: "حومه‌ی تورنتو (GTA)", candidates: GTA_SUBURBS, province: "Ontario", confidence: "region" },
  "742": { city: null, region: "حومه‌ی تورنتو (GTA)", candidates: GTA_SUBURBS, province: "Ontario", confidence: "region" },

  "613": { city: "Ottawa", region: "اتاوا", candidates: ["Ottawa", "Kanata", "Nepean", "Orleans"], province: "Ontario", confidence: "city" },
  "343": { city: "Ottawa", region: "اتاوا", candidates: ["Ottawa", "Kanata", "Nepean", "Orleans"], province: "Ontario", confidence: "city" },
  "519": { city: null, region: "جنوب‌غرب انتاریو", candidates: ["London", "Kitchener", "Waterloo", "Windsor", "Guelph", "Cambridge"], province: "Ontario", confidence: "region" },
  "226": { city: null, region: "جنوب‌غرب انتاریو", candidates: ["London", "Kitchener", "Waterloo", "Windsor", "Guelph", "Cambridge"], province: "Ontario", confidence: "region" },
  "548": { city: null, region: "جنوب‌غرب انتاریو", candidates: ["London", "Kitchener", "Waterloo", "Windsor", "Guelph", "Cambridge"], province: "Ontario", confidence: "region" },
  "705": { city: null, region: "شمال و مرکز انتاریو", candidates: ["Barrie", "Sudbury", "Orillia", "Peterborough", "Muskoka"], province: "Ontario", confidence: "region" },
  "249": { city: null, region: "شمال و مرکز انتاریو", candidates: ["Barrie", "Sudbury", "Orillia", "Peterborough"], province: "Ontario", confidence: "region" },
  "807": { city: null, region: "شمال‌غرب انتاریو", candidates: ["Thunder Bay"], province: "Ontario", confidence: "region" },

  "604": { city: null, region: "ونکوور بزرگ", candidates: VANCOUVER_METRO, province: "British Columbia", confidence: "region" },
  "778": { city: null, region: "ونکوور بزرگ", candidates: VANCOUVER_METRO, province: "British Columbia", confidence: "region" },
  "236": { city: null, region: "ونکوور بزرگ", candidates: VANCOUVER_METRO, province: "British Columbia", confidence: "region" },
  "672": { city: null, region: "ونکوور بزرگ", candidates: VANCOUVER_METRO, province: "British Columbia", confidence: "region" },
  "250": { city: null, region: "بریتیش کلمبیا (خارج ونکوور)", candidates: ["Victoria", "Kelowna", "Kamloops", "Nanaimo", "Prince George"], province: "British Columbia", confidence: "region" },

  "514": { city: "Montreal", region: "مونترال", candidates: MONTREAL_METRO, province: "Quebec", confidence: "city" },
  "438": { city: "Montreal", region: "مونترال", candidates: MONTREAL_METRO, province: "Quebec", confidence: "city" },
  "450": { city: null, region: "حومه‌ی مونترال", candidates: ["Laval", "Longueuil", "Brossard"], province: "Quebec", confidence: "region" },
  "579": { city: null, region: "حومه‌ی مونترال", candidates: ["Laval", "Longueuil", "Brossard"], province: "Quebec", confidence: "region" },
  "418": { city: null, region: "کبک (شرق)", candidates: ["Quebec City", "Lévis"], province: "Quebec", confidence: "region" },

  "403": { city: "Calgary", region: "کلگری", candidates: ["Calgary", "Airdrie", "Lethbridge"], province: "Alberta", confidence: "city" },
  "587": { city: null, region: "آلبرتا", candidates: ["Calgary", "Edmonton", "Red Deer"], province: "Alberta", confidence: "region" },
  "825": { city: null, region: "آلبرتا", candidates: ["Calgary", "Edmonton", "Red Deer"], province: "Alberta", confidence: "region" },
  "780": { city: "Edmonton", region: "ادمونتون", candidates: ["Edmonton", "St. Albert", "Sherwood Park"], province: "Alberta", confidence: "city" },

  "204": { city: "Winnipeg", region: "وینیپگ", candidates: ["Winnipeg", "Brandon"], province: "Manitoba", confidence: "city" },
  "431": { city: "Winnipeg", region: "وینیپگ", candidates: ["Winnipeg", "Brandon"], province: "Manitoba", confidence: "city" },
  "306": { city: null, region: "ساسکاچوان", candidates: ["Saskatoon", "Regina"], province: "Saskatchewan", confidence: "region" },
  "639": { city: null, region: "ساسکاچوان", candidates: ["Saskatoon", "Regina"], province: "Saskatchewan", confidence: "region" },
  "902": { city: null, region: "نوا اسکوشیا / PEI", candidates: ["Halifax", "Dartmouth", "Bedford", "Charlottetown"], province: "Nova Scotia", confidence: "region" },
  "782": { city: null, region: "نوا اسکوشیا / PEI", candidates: ["Halifax", "Dartmouth", "Bedford", "Charlottetown"], province: "Nova Scotia", confidence: "region" },
  "506": { city: null, region: "نیوبرانزویک", candidates: ["Moncton", "Fredericton", "Saint John"], province: "New Brunswick", confidence: "region" },
  "709": { city: null, region: "نیوفاندلند", candidates: ["St. John's"], province: "Newfoundland and Labrador", confidence: "region" },
};

/** Pull the 3-digit area code out of any Canadian phone format. */
export function areaCodeOf(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = toLatinDigits(phone).replace(/\D/g, "");
  // +1 416 …  /  1 416 …  /  416 …
  const national = digits.startsWith("1") && digits.length >= 11 ? digits.slice(1) : digits;
  if (national.length < 10) return null;
  const code = national.slice(0, 3);
  return /^[2-9]\d\d$/.test(code) ? code : null;
}

export function lookupAreaCode(phone: string | null | undefined): (AreaCodeMatch & { code: string }) | null {
  const code = areaCodeOf(phone);
  if (!code) return null;
  const hit = MAP[code];
  return hit ? { ...hit, code } : null;
}

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync("apps/web/.env.local", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  })
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type R = Record<string, any>;
const rows: R[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("businesses")
    .select("id,name,name_en,slug,city,province,category,phone,address,short_description,description,website,cover_url,logo_url,status,updated_at,working_hours,google_maps_url,instagram,telegram,verified_at")
    .order("id").range(from, from + 999);
  if (error) { console.error(error); process.exit(1); }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < 1000) break;
}
console.log("TOTAL rows:", rows.length);
const byStatus: R = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
console.log("by status:", byStatus);

const PUB = rows.filter(r => ["PUBLISHED"].includes(r.status));
console.log("public-ish:", PUB.length);

const pct = (n: number) => `${n} (${(100*n/PUB.length).toFixed(1)}%)`;
const has = (f: string) => pct(PUB.filter(r => r[f] != null && String(r[f]).trim() !== "").length);
for (const f of ["name_en","slug","city","province","category","phone","address","short_description","description","website","cover_url","logo_url","working_hours","google_maps_url","instagram","verified_at"])
  console.log(`  fill ${f.padEnd(20)}`, has(f));

// name quality: latin letter immediately followed by persian char (no space)
const mashed = PUB.filter(r => /[A-Za-z][؀-ۿ]|[؀-ۿ][A-Za-z]/.test(r.name ?? ""));
console.log("\nMASHED names (latin+persian, no space):", pct(mashed.length));
mashed.slice(0,10).forEach(r => console.log("   ", r.slug, "|", r.name));

const arabicYK = PUB.filter(r => /[يك]/.test((r.name ?? "") + (r.short_description ?? "")));
console.log("\nArabic ي/ك in name or short_description:", pct(arabicYK.length));

const longName = PUB.filter(r => (r.name ?? "").length > 60);
console.log("names > 60 chars:", pct(longName.length));

// duplicate names
const nameCount: R = {};
for (const r of PUB) nameCount[r.name] = (nameCount[r.name] ?? 0) + 1;
const dupes = Object.entries(nameCount).filter(([,c]) => (c as number) > 1);
console.log("duplicate name groups:", dupes.length, "rows involved:", dupes.reduce((a,[,c])=>a+(c as number),0));

// city x category
const cc: R = {};
for (const r of PUB) { if (!r.city || !r.category) continue; const k = `${r.category}||${r.city}`; cc[k] = (cc[k]??0)+1; }
const pairs = Object.entries(cc).sort((a,b)=>(b[1] as number)-(a[1] as number));
console.log("\ncity×category combos with >=1:", pairs.length);
console.log("  >=3 listings (indexable):", pairs.filter(([,c])=>(c as number)>=3).length);
console.log("  ==1 or 2:", pairs.filter(([,c])=>(c as number)<3).length);
console.log("  top 25:"); pairs.slice(0,25).forEach(([k,c])=>console.log("   ", c, k));

const cats: R = {}; for (const r of PUB) cats[r.category ?? "(null)"] = (cats[r.category??"(null)"]??0)+1;
console.log("\nby category:", Object.entries(cats).sort((a,b)=>(b[1] as number)-(a[1] as number)));
const cities: R = {}; for (const r of PUB) cities[r.city ?? "(null)"] = (cities[r.city??"(null)"]??0)+1;
const cityArr = Object.entries(cities).sort((a,b)=>(b[1] as number)-(a[1] as number));
console.log("\ndistinct cities:", cityArr.length, "with >=3:", cityArr.filter(([,c])=>(c as number)>=3).length);
console.log("top 20 cities:", cityArr.slice(0,20));

// updated_at clustering
const ts: R = {}; for (const r of PUB) { const d = (r.updated_at??"").slice(0,10); ts[d]=(ts[d]??0)+1; }
console.log("\nupdated_at top 10 days:", Object.entries(ts).sort((a,b)=>(b[1] as number)-(a[1] as number)).slice(0,10));

// working_hours reality check — 100% fill is suspicious
const wh: R = {};
for (const r of PUB) { const s = JSON.stringify(r.working_hours); wh[s] = (wh[s]??0)+1; }
const whArr = Object.entries(wh).sort((a,b)=>(b[1] as number)-(a[1] as number));
console.log("\nworking_hours distinct shapes:", whArr.length);
whArr.slice(0,3).forEach(([k,c])=>console.log("   ", c, "×", String(k).slice(0,220)));

// ============================================================================
// Source: app/search/page.tsx
// Version: 2.0.0 — 2026-08-19
// Why: The search results page — the P0 that was open since launch. Reads
//      q / city / category / verified from the URL so results are shareable,
//      calls the ranked Persian-aware RPC, logs every query (zero-result ones
//      are the demand signal), and offers the honest next step when nothing
//      matches: broaden, or ask for it.
//
//      v2 adds two layers over the lexical RPC:
//      · Announcements — «آلبالو ترش رسید», posted yesterday, is the best
//        possible answer to «هوس آلبالو کردم», and announcements were never
//        searchable before. Live ones now surface in their own strip.
//      · Smart expansion (lib/search/smart.ts) — when lexical results are
//        thin, a small model extracts what the visitor is after and the SAME
//        lexical RPC re-runs over those terms. The model produces search
//        terms, never results, so nothing it says can invent a business.
//        Its block is visibly labelled as interpretation («جستجوی هوشمند»)
//        and its reason line never claims a business stocks anything —
//        related, not confirmed. Both layers fail soft to plain lexical.
// Env / Identity: Server component; RLS applies.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, BadgeCheck, MapPin, Megaphone, Search as SearchIcon, SlidersHorizontal, Sparkles, Wand2 } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { BusinessCard } from "@/components/business/business-card";
import { SuggestionBox } from "@/components/suggestion-box";
import { PUBLIC_STATUSES, fetchAllRows } from "@goplaza/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryDetail } from "@/lib/data/category-details";
import { cleanQuery, logSearch, searchAnnouncements, searchBusinesses, type AnnouncementHit, type SearchHit } from "@/lib/search";
import { expandQuery, type SmartExpansion } from "@/lib/search/smart";
import { isPlaceholderCity } from "@/lib/seo/geo-index";
import { faDigits as fa } from "@goplaza/core";

const PAGE = 24;

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { q } = await searchParams;
  const term = cleanQuery(q);
  return { title: term ? `جستجو: ${term}` : "جستجو", robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = cleanQuery(sp.q);
  const city = cleanQuery(sp.city) || null;
  const category = cleanQuery(sp.category) || null;
  const verifiedOnly = sp.verified === "1";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createSupabaseServerClient();
  const [first, { data: categories }, cityRows] = await Promise.all([
    q || city || category ? searchBusinesses(supabase, { q, city, category, verifiedOnly, limit: PAGE, offset: (page - 1) * PAGE }) : Promise.resolve({ hits: [], total: 0 }),
    supabase.from("categories").select("slug, name").eq("is_active", true).order("display_order"),
    // Paginated: unbounded, PostgREST stops at 1,000 of the ~10,700 published
    // rows without an error, and the "top 30 cities" filter below would be a
    // frequency ranking over a 9% sample in whatever order the page came back.
    fetchAllRows<{ city: string | null }>(() =>
      supabase.from("businesses").select("city").in("status", PUBLIC_STATUSES).not("city", "is", null).order("id")
    ),
  ]);
  // A city filter that finds nothing should not be a dead end: rerun without
  // it and say so. The query is still logged with the city, so the demand
  // signal ("رستوران in Toronto") is not lost.
  let { hits, total } = first;
  let widened = false;
  if (q && city && total === 0) {
    const wide = await searchBusinesses(supabase, { q, category, verifiedOnly, limit: PAGE, offset: (page - 1) * PAGE });
    if (wide.total > 0) { hits = wide.hits; total = wide.total; widened = true; }
  }

  // ── Layer 2: live announcements matching the literal query ──────────────
  let announcementHits: AnnouncementHit[] = q ? await searchAnnouncements(supabase, q, 6) : [];

  // ── Layer 3: smart expansion, only when lexical came back thin ──────────
  // First page only — the block does not paginate, repeating it on page 2
  // would just duplicate cards.
  let smart: SmartExpansion | null = null;
  let smartHits: (SearchHit & { via: string })[] = [];
  let smartCategoryPicks: { slug: string; name: string; count: number }[] = [];
  if (q && page === 1 && total < 5) {
    const hdrs = await headers();
    const ip = (hdrs.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    smart = await expandQuery(q, ip);
  }
  if (smart) {
    const terms = smart.terms.slice(0, 4);
    const directIds = new Set(hits.map((h) => h.id));
    const [termResults, termAnnouncements] = await Promise.all([
      Promise.all(terms.map((t) => searchBusinesses(supabase, { q: t, city, category, verifiedOnly, limit: 8 }))),
      Promise.all(terms.map((t) => searchAnnouncements(supabase, t, 4))),
    ]);
    const seen = new Set<string>(directIds);
    terms.forEach((term, i) => {
      for (const hit of termResults[i].hits) {
        if (seen.has(hit.id)) continue;
        seen.add(hit.id);
        smartHits.push({ ...hit, via: term });
      }
    });
    smartHits = smartHits.slice(0, 12);
    // Announcements found through expanded terms join the strip, deduped.
    const annSeen = new Set(announcementHits.map((a) => a.announcement_id));
    for (const list of termAnnouncements) {
      for (const a of list) {
        if (annSeen.has(a.announcement_id)) continue;
        annSeen.add(a.announcement_id);
        announcementHits.push(a);
      }
    }
    announcementHits = announcementHits.slice(0, 6);
    // Category fallback: when even the expanded terms found little, point at
    // the categories the model picked — as browse links with real counts,
    // not as more cards pretending to match.
    if (smartHits.length < 3 && smart.categories.length) {
      const counts = await Promise.all(
        smart.categories.map((slug) =>
          supabase
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .in("status", ["APPROVED", "PUBLISHED"])
            .eq("category", slug)
        )
      );
      smartCategoryPicks = smart.categories
        .map((slug, i) => ({ slug, name: getCategoryDetail(slug).name, count: counts[i].count ?? 0 }))
        .filter((c) => c.count > 0);
    }
  }
  const catLabel = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
  const cityFreq = new Map<string, number>();
  // Placeholder values («نامشخص» &c.) skipped: now that the count runs over
  // the full table instead of a 1,000-row sample, «نامشخص» ranks 7th — it is
  // an admin cleanup queue, not a place a visitor can filter by.
  for (const r of cityRows ?? []) { const c = String(r.city).trim(); if (c && !isPlaceholderCity(c)) cityFreq.set(c, (cityFreq.get(c) ?? 0) + 1); }
  const cities = [...cityFreq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 30);

  if (q && page === 1) {
    const { data: { user } } = await supabase.auth.getUser();
    void logSearch(supabase, { q, city, category, resultCount: total, source: "web", userId: user?.id });
  }

  const href = (patch: Record<string, string | null | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q, city, category, verified: verifiedOnly ? "1" : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return `/search${s ? `?${s}` : ""}`;
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <PageShell currentPath="/search" currentSection="business">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10" dir="rtl">
        {/* Search bar */}
        <form action="/search" method="get" className="bg-white rounded-2xl p-2 shadow-[0_18px_50px_rgba(20,33,61,0.10)] border border-[color:var(--line)] flex flex-col md:flex-row gap-2">
          <label className="flex-1 flex items-center gap-2 px-3">
            <SearchIcon size={18} className="text-[color:var(--annabi)] shrink-0" />
            <input name="q" defaultValue={q} placeholder="نام کسب‌وکار، خدمت، دسته یا شهر…" className="h-12 w-full bg-transparent outline-none text-[15px] text-[color:var(--text)]" autoFocus={!q} />
          </label>
          <label className="md:w-52 flex items-center gap-2 px-3 md:border-r md:border-[color:var(--line)]">
            <MapPin size={18} className="text-[color:var(--lajvard)] shrink-0" />
            <select name="city" defaultValue={city ?? ""} className="h-12 w-full bg-transparent outline-none text-[15px] text-[color:var(--text)]">
              <option value="">همه‌ی شهرها</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {verifiedOnly ? <input type="hidden" name="verified" value="1" /> : null}
          <button type="submit" className="h-12 md:px-7 rounded-xl bg-[color:var(--annabi)] hover:bg-[#5A1124] text-[#f6f1e8] font-bold transition">جستجو</button>
        </form>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[color:var(--muted-text)] inline-flex items-center gap-1"><SlidersHorizontal size={13} /> فیلتر:</span>
          <Link href={href({ verified: verifiedOnly ? null : "1" })} className={`px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1 ${verifiedOnly ? "bg-[color:var(--annabi)] border-transparent text-[#f6f1e8]" : "bg-white border-[color:var(--line)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"}`}>
            <BadgeCheck size={12} /> فقط احرازشده
          </Link>
          <span className="w-px h-4 bg-[color:var(--line)] mx-1" />
          <Link href={href({ category: null })} className={`px-3 py-1.5 rounded-full border transition ${!category ? "bg-[color:var(--text)] border-transparent text-[#f6f1e8]" : "bg-white border-[color:var(--line)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"}`}>همه‌ی دسته‌ها</Link>
          {(categories ?? []).map((c) => (
            <Link key={c.slug} href={href({ category: category === c.slug ? null : c.slug })} className={`px-3 py-1.5 rounded-full border transition ${category === c.slug ? "bg-[color:var(--text)] border-transparent text-[#f6f1e8]" : "bg-white border-[color:var(--line)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"}`}>{c.name}</Link>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[color:var(--text)]">
              {q ? <>نتایج برای «{q}»</> : city || category ? <>{[category ? catLabel.get(category) : null, city].filter(Boolean).join(" در ")}</> : "جستجو در پلازا"}
            </h1>
            <p className="text-sm text-[color:var(--muted-text)] mt-1">
              {q || city || category ? <>{fa(total)} کسب‌وکار{city && !widened ? ` در ${city}` : ""}{verifiedOnly ? " · فقط احرازشده" : ""}</> : "نام، خدمت، دسته یا شهر را بنویس — فارسی یا انگلیسی، فرقی نمی‌کند."}
            </p>
            {widened ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)]/15 px-3 py-1 text-xs font-bold text-[color:var(--text)]">
                در {city} چیزی برای «{q}» نبود — این‌ها از همه‌ی کاناداست.
                <Link href={href({ city: null })} className="text-[color:var(--lajvard)] underline-offset-4 hover:underline">حذف فیلتر شهر</Link>
              </p>
            ) : null}
          </div>
        </div>

        {/* Live announcements that mention what was searched — a business
            that just posted «آلبالو رسید» beats any static listing match. */}
        {announcementHits.length ? (
          <section className="mt-6">
            <h2 className="flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
              <Megaphone size={16} className="text-[color:var(--annabi)]" /> در اعلان‌های تازه‌ی کسب‌وکارها
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {announcementHits.map((a) => (
                <Link
                  key={a.announcement_id}
                  href={`/businesses/${a.slug || a.business_id}`}
                  className="group rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/8 p-4 transition hover:border-[color:var(--gold)]"
                >
                  <div className="font-bold text-[color:var(--text)] group-hover:text-[color:var(--annabi)]">{a.announcement_title}</div>
                  {a.announcement_body ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-[color:var(--muted-text)]">{a.announcement_body}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--muted-text)]">
                    <span className="font-bold text-[color:var(--text)]">{a.name}</span>
                    {a.city ? <span>· {a.city}</span> : null}
                    <span>· {new Date(a.announcement_created_at).toLocaleDateString("fa-IR", { day: "numeric", month: "long" })}</span>
                    {a.announcement_expires_at ? (
                      <span>· تا {new Date(a.announcement_expires_at).toLocaleDateString("fa-IR", { day: "numeric", month: "long" })}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Results */}
        {hits.length ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {hits.map((h) => <BusinessCard key={h.id} business={h as any} categoryLabel={h.category ? catLabel.get(h.category) : null} />)}
            </div>
            {totalPages > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
                {page > 1 ? <Link href={href({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg bg-white border border-[color:var(--line)]">قبلی</Link> : null}
                <span className="text-[color:var(--muted-text)]">صفحه‌ی {fa(page)} از {fa(totalPages)}</span>
                {page < totalPages ? <Link href={href({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg bg-white border border-[color:var(--line)]">بعدی</Link> : null}
              </nav>
            ) : null}
          </>
        ) : (q || city || category) && !smartHits.length && !smartCategoryPicks.length && !announcementHits.length ? (
          <div className="mt-8 rounded-3xl bg-white border border-[color:var(--line)] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg)] text-[color:var(--annabi)] flex items-center justify-center mx-auto mb-3"><SearchIcon size={24} /></div>
            <div className="text-lg font-black text-[color:var(--text)]">چیزی پیدا نشد</div>
            <p className="text-sm text-[color:var(--muted-text)] mt-1 max-w-md mx-auto leading-relaxed">
              {city || category || verifiedOnly ? "فیلترها را کم کن، " : ""}املا را عوض کن، یا کلی‌تر بنویس (مثلاً «دندان» به‌جای «دندانپزشکی زیبایی»). این جستجو را ثبت کردیم — اگر کسب‌وکاری برای آن ثبت شود، اینجا ظاهر می‌شود.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center text-sm">
              {city || category || verifiedOnly ? <Link href={href({ city: null, category: null, verified: null })} className="px-4 py-2 rounded-xl bg-[color:var(--text)] text-[#f6f1e8] font-bold">حذف فیلترها</Link> : null}
              <Link href="/categories" className="px-4 py-2 rounded-xl bg-white border border-[color:var(--line)] font-bold text-[color:var(--text)]">مرور دسته‌ها</Link>
              <Link href="/dashboard/business/new" className="px-4 py-2 rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)] font-bold inline-flex items-center gap-1"><Sparkles size={14} /> این کسب‌وکار مال من است — ثبتش کنم</Link>
            </div>
            {/* The zero-result moment is exactly when someone knows what is
                missing. Ask them, right here. */}
            <div className="mt-6 text-right">
              <SuggestionBox
                page={`/search?q=${encodeURIComponent(q)}`}
                compact
                title="دنبال چی بودی که نبود؟"
                hint="بگو یا بنویس — همین درخواست‌ها می‌گویند چه کسب‌وکاری را باید پیدا و دعوت کنیم."
              />
            </div>
          </div>
        ) : !(q || city || category) ? (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {["وکیل مهاجرت", "دندانپزشک", "رستوران ایرانی", "حسابدار", "املاک", "آرایشگاه", "سوپرمارکت ایرانی", "مکانیک"].map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="rounded-2xl bg-white border border-[color:var(--line)] px-4 py-3 font-bold text-[color:var(--text)] hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] transition inline-flex items-center justify-between">
                {s} <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
              </Link>
            ))}
          </div>
        ) : null}

        {/* Smart block — visibly labelled interpretation, never presented as
            direct matches. Cards are real RPC results for the expanded
            terms; the reason line says "related", the prompt forbids it from
            claiming any business stocks anything. */}
        {smart && (smartHits.length || smartCategoryPicks.length) ? (
          <section className="mt-8">
            <div className="rounded-3xl border border-[color:var(--lajvard)]/25 bg-[color:var(--lajvard)]/[0.04] p-5 md:p-6">
              <h2 className="flex items-center gap-2 text-base font-black text-[color:var(--text)]">
                <Wand2 size={17} className="text-[color:var(--lajvard)]" /> جستجوی هوشمند
              </h2>
              {hits.length === 0 ? (
                <p className="mt-1 text-xs text-[color:var(--muted-text)]">نتیجه‌ی مستقیمی برای «{q}» نبود؛ این‌ها بر اساس برداشت ما از جستجوی توست.</p>
              ) : null}
              {smart.reason ? (
                <p className="mt-2 text-sm leading-7 text-[color:var(--text)]/85">{smart.reason}</p>
              ) : null}
              {smart.terms.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[color:var(--muted-text)]">جستجوهای مرتبط:</span>
                  {smart.terms.map((t) => (
                    <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-[color:var(--lajvard)]/30 bg-white px-3 py-1.5 font-bold text-[color:var(--lajvard)] transition hover:bg-[color:var(--lajvard)] hover:text-white">
                      {t}
                    </Link>
                  ))}
                </div>
              ) : null}
              {smartHits.length ? (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {smartHits.map((h) => (
                    <div key={h.id}>
                      <BusinessCard business={h as never} categoryLabel={h.category ? catLabel.get(h.category) : null} />
                      <p className="mt-1 pr-1 text-[11px] text-[color:var(--muted-text)]">مرتبط با «{h.via}»</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {smartCategoryPicks.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {smartCategoryPicks.map((c) => (
                    <Link key={c.slug} href={`/categories/${c.slug}`} className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)]/40">
                      مرور {c.name} <span className="text-xs font-normal text-[color:var(--muted-text)]">({fa(c.count)} کسب‌وکار)</span>
                      <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {hits.length === 0 ? (
              <div className="mt-4 text-right">
                <SuggestionBox
                  page={`/search?q=${encodeURIComponent(q)}`}
                  compact
                  title="این‌ها آن چیزی نبود که می‌خواستی؟"
                  hint="بگو یا بنویس دنبال چه بودی — همین درخواست‌ها می‌گویند چه کسب‌وکاری را باید پیدا و دعوت کنیم."
                />
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

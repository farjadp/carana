// ============================================================================
// Source: app/channels/page.tsx
// Version: 2.0.0 — 2026-08-26
// Why: «کانال‌ها و گروه‌ها» — the full list. Design:
//      docs/15-channels-directory.md.
//
//      v2 makes it a real index: paged, sortable, and filterable by platform,
//      subject, city and activity. v1 took the first 200 rows and stopped,
//      which is a list that silently lies about its own length as soon as
//      there are 201 of anything.
//
//      Default order is FRESHNESS — last_post_at descending, rows we could
//      never read last — and not member count. Ranking on members would put
//      the biggest bought-member channel on top, and we have no way to detect
//      a bought member. Sorting by members is offered, because a reader who
//      asks for it knows what they are asking for; it is just not the default.
//
//      A dormant channel is labelled, never hidden. Removing it would destroy
//      the one fact this page exists to publish — which is also why «راکد» is
//      a filter you can select rather than a state we quietly drop.
//
//      City filtering is a query parameter, not /channels/[city]: that route
//      would collide with /channels/[slug] and a slug shaped like a city would
//      silently resolve to the wrong page. Exactly the /jobs/[city] trap.
// Env / Identity: Reads through the request-scoped (anon) client, so the RLS
//      policy — published, and not past its confirmation date — decides
//      visibility. The filters below say the same thing out loud; they are not
//      the security boundary.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import {
  CHANNEL_ACTIVE_DAYS,
  CHANNEL_PLATFORMS,
  CHANNEL_PLATFORM_LABELS_FA,
  CHANNEL_QUIET_DAYS,
  fetchAllRows,
  type ChannelPlatform,
} from "@goplaza/core";

import { CHANNEL_CARD_COLUMNS, ChannelCard, type ChannelCardRow } from "@/components/channels/channel-card";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { collectionLd } from "@/lib/seo/entity";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/time";

export const metadata: Metadata = {
  title: "کانال‌ها و گروه‌های فارسی‌زبان کانادا",
  description:
    "فهرست کانال‌های تلگرام و گروه‌های واتس‌اپ جامعه ایرانی کانادا — با تاریخ آخرین فعالیت و تعداد اعضا. لینکش همه‌جا هست؛ این‌که هنوز زنده باشد نه.",
  alternates: { canonical: "/channels" },
};

// The numbers under each card are refreshed once a day by the metrics cron, so
// caching for an hour cannot make this page staler than its data already is.
export const revalidate = 3600;

const PAGE_SIZE = 24;
const fa = (n: number) => n.toLocaleString("fa-IR");

const SORTS = [
  { key: "fresh", label: "تازه‌ترین فعالیت" },
  { key: "members", label: "بیشترین عضو" },
  { key: "new", label: "تازه‌ثبت‌شده" },
] as const;

const ACTIVITIES = [
  { key: "active", label: `فعال` },
  { key: "quiet", label: "کم‌فعال" },
  { key: "dormant", label: "راکد" },
  { key: "unknown", label: "نامشخص" },
] as const;

type Search = {
  platform?: string;
  category?: string;
  city?: string;
  activity?: string;
  sort?: string;
  page?: string;
};

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { platform, category, city, activity } = params;
  const sort = (SORTS.find((s) => s.key === params.sort)?.key ?? "fresh") as (typeof SORTS)[number]["key"];
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const liveFilter = `confirm_by.is.null,confirm_by.gt.${nowIso}`;

  let query = supabase
    .from("channels")
    .select(CHANNEL_CARD_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .or(liveFilter);

  if (platform && (CHANNEL_PLATFORMS as string[]).includes(platform)) query = query.eq("platform", platform);
  if (category) query = query.eq("category_slug", category);
  if (city) query = query.ilike("city", city);

  // Activity is computed from last_post_at at read time and is deliberately
  // not a column (see channelActivity() in core). Filtering on it therefore
  // means filtering on the timestamp, with the SAME thresholds the labels use
  // — imported from core rather than retyped, so the chip and the badge can
  // never disagree about where «فعال» ends.
  if (activity === "active") query = query.gte("last_post_at", daysAgoIso(CHANNEL_ACTIVE_DAYS));
  else if (activity === "quiet") {
    query = query.gte("last_post_at", daysAgoIso(CHANNEL_QUIET_DAYS)).lt("last_post_at", daysAgoIso(CHANNEL_ACTIVE_DAYS));
  } else if (activity === "dormant") query = query.lt("last_post_at", daysAgoIso(CHANNEL_QUIET_DAYS));
  else if (activity === "unknown") query = query.is("last_post_at", null);

  if (sort === "members") {
    // nullsFirst: false keeps every unmeasured row below every measured one.
    // A channel whose members we never counted has not earned a place among
    // the largest.
    query = query.order("member_count", { ascending: false, nullsFirst: false });
  } else if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("last_post_at", { ascending: false, nullsFirst: false });
  }

  const [{ data: channels, count }, { data: categories }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("channel_categories").select("slug, name_fa").order("position"),
  ]);

  const rows = (channels ?? []) as ChannelCardRow[];
  const cats = categories ?? [];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Cities come from every published row, not from the page in front of you —
  // otherwise the chips would change under the reader as they paged. Drained
  // rather than capped: an unbounded select stops at 1,000 rows without
  // erroring, which is the trap that hid 80% of the sitemap. See fetch-all.ts.
  const cityRows = await fetchAllRows<{ city: string | null }>(() =>
    supabase.from("channels").select("city").eq("status", "published").or(liveFilter),
  );
  const cities = [...new Set(cityRows.map((r) => r.city).filter(Boolean) as string[])].sort();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      active
        ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
        : "border-[color:var(--line)] bg-white text-[color:var(--text)] hover:border-[color:var(--lajvard)]"
    }`;

  /** Any filter change resets to page 1 — page 7 of a different query is nowhere. */
  const withParams = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { ...params, page: undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/channels?${qs}` : "/channels";
  };

  const filtered = !!(platform || category || city || activity);

  return (
    <PageShell currentPath="/channels" currentSection="home">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "کانال‌ها و گروه‌ها", url: "/channels" }])} />
      {rows.length ? (
        <JsonLd
          data={collectionLd({
            name: "کانال‌ها و گروه‌های فارسی‌زبان کانادا",
            path: "/channels",
            total,
            items: rows.map((c) => ({ name: c.title, path: `/channels/${c.slug}` })),
          })}
        />
      ) : null}

      <main className="page-main">
        <section className="mb-8">
          <p className="eyebrow">کانال‌ها و گروه‌ها</p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-4xl">
            کانال‌ها و گروه‌های فارسی‌زبان کانادا
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-[color:var(--text)]/80">
            لینک این کانال‌ها همه‌جا هست. چیزی که هیچ‌جا نیست، این است که هنوز زنده‌اند یا نه. این‌جا
            کنار هر کانال می‌نویسیم آخرین بار کِی پست گذاشته، چند عضو دارد، و ما کِی این را بررسی
            کرده‌ایم — و اگر نتوانسته باشیم بررسی کنیم، همین را می‌گوییم.
          </p>
          <p className="mt-3 max-w-2xl text-xs leading-7 text-[color:var(--muted-text)]">
            محتوای هیچ کانالی این‌جا نمایش داده نمی‌شود؛ فقط اطلاعات خودِ کانال.
          </p>
        </section>

        {total > 0 || filtered ? (
          <section className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link href={withParams({ platform: undefined })} className={chip(!platform)}>هر دو</Link>
              {CHANNEL_PLATFORMS.map((p) => (
                <Link key={p} href={withParams({ platform: p })} className={chip(platform === p)}>
                  {CHANNEL_PLATFORM_LABELS_FA[p as ChannelPlatform]}
                </Link>
              ))}
              <span className="mx-1 w-px self-stretch bg-[color:var(--line)]" aria-hidden />
              <Link href={withParams({ activity: undefined })} className={chip(!activity)}>هر وضعیتی</Link>
              {ACTIVITIES.map((a) => (
                <Link key={a.key} href={withParams({ activity: a.key })} className={chip(activity === a.key)}>
                  {a.label}
                </Link>
              ))}
            </div>

            {cats.length ? (
              <div className="flex flex-wrap gap-2">
                <Link href={withParams({ category: undefined })} className={chip(!category)}>همه موضوع‌ها</Link>
                {cats.map((c) => (
                  <Link key={c.slug} href={withParams({ category: c.slug })} className={chip(category === c.slug)}>
                    {c.name_fa}
                  </Link>
                ))}
              </div>
            ) : null}

            {cities.length > 1 || city ? (
              <div className="flex flex-wrap gap-2">
                <Link href={withParams({ city: undefined })} className={chip(!city)}>همه شهرها</Link>
                {cities.map((c) => (
                  <Link key={c} href={withParams({ city: c })} className={chip(city?.toLowerCase() === c.toLowerCase())}>
                    {c}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[color:var(--muted-text)]">ترتیب:</span>
              {SORTS.map((s) => (
                <Link key={s.key} href={withParams({ sort: s.key })} className={chip(sort === s.key)}>
                  {s.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* An empty index is the normal state on day one and says so plainly,
            rather than pretending the section is fuller than it is. */}
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--line)] bg-white px-6 py-10 text-center md:px-10">
            <h2 className="mb-2 text-xl font-black text-[color:var(--text)]">
              {filtered ? "با این فیلترها چیزی پیدا نشد." : "هنوز هیچ کانالی ثبت نشده."}
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm leading-8 text-[color:var(--muted-text)]">
              {filtered
                ? "فیلترها را بردار تا همه موارد را ببینی."
                : "اولین کانال می‌تواند مال تو باشد. ثبت رایگان است و لازم نیست کسب‌وکاری داشته باشی."}
            </p>
            <Link
              href={filtered ? "/channels" : "/channels/submit"}
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--lajvard)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Plus size={16} />
              {filtered ? "همه کانال‌ها" : "ثبت کانال یا گروه"}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[color:var(--muted-text)]">
                {fa(total)} کانال و گروه
                {sort === "fresh" ? " · مرتب‌شده بر اساس تازگی، نه تعداد عضو" : null}
              </p>
              <Link
                href="/channels/submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-xs font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)]"
              >
                <Plus size={14} /> ثبت کانال یا گروه
              </Link>
            </div>

            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <ChannelCard channel={c} />
                </li>
              ))}
            </ul>

            {lastPage > 1 ? (
              <nav className="pager" aria-label="صفحه‌بندی">
                {page > 1 ? (
                  <Link href={withParams({ ...params, page: String(page - 1) })} className="pager-btn">
                    صفحه قبل
                  </Link>
                ) : (
                  <span className="pager-btn is-disabled">صفحه قبل</span>
                )}
                <span className="pager-status">
                  صفحه {fa(page)} از {fa(lastPage)}
                </span>
                {page < lastPage ? (
                  <Link href={withParams({ ...params, page: String(page + 1) })} className="pager-btn">
                    صفحه بعد
                  </Link>
                ) : (
                  <span className="pager-btn is-disabled">صفحه بعد</span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </main>
    </PageShell>
  );
}

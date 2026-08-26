// ============================================================================
// Source: app/channels/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: «کانال‌ها و گروه‌ها» — the public index. Design:
//      docs/15-channels-directory.md.
//
//      Links to these channels are everywhere; what is nowhere is whether they
//      are still alive. So the default order is FRESHNESS — last_post_at
//      descending, unmeasured rows last — and not member count. Ranking on
//      members would put the biggest bought-member channel on top, and we have
//      no way to detect a bought member.
//
//      A dormant channel is labelled, never hidden. Removing it would destroy
//      the one fact this page exists to publish.
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

import { CHANNEL_PLATFORMS, CHANNEL_PLATFORM_LABELS_FA, type ChannelPlatform } from "@goplaza/core";

import { CHANNEL_CARD_COLUMNS, ChannelCard, type ChannelCardRow } from "@/components/channels/channel-card";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { collectionLd } from "@/lib/seo/entity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "کانال‌ها و گروه‌های فارسی‌زبان کانادا",
  description:
    "فهرست کانال‌های تلگرام و گروه‌های واتس‌اپ جامعه ایرانی کانادا — با تاریخ آخرین فعالیت و تعداد اعضا. لینکش همه‌جا هست؛ این‌که هنوز زنده باشد نه.",
  alternates: { canonical: "/channels" },
};

// The numbers under each card are refreshed once a day by the metrics cron, so
// caching the page for an hour cannot make it staler than the data already is.
export const revalidate = 3600;

const fa = (n: number) => n.toLocaleString("fa-IR");

type Search = { platform?: string; category?: string; city?: string };

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { platform, category, city } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const nowIso = new Date().toISOString();

  let query = supabase
    .from("channels")
    .select(CHANNEL_CARD_COLUMNS)
    .eq("status", "published")
    .or(`confirm_by.is.null,confirm_by.gt.${nowIso}`)
    // Freshness first. `nullsFirst: false` is what puts every row we could
    // never measure below every row we could — a channel with an unknown last
    // post has not earned the top of the list.
    .order("last_post_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (platform && (CHANNEL_PLATFORMS as string[]).includes(platform)) query = query.eq("platform", platform);
  if (category) query = query.eq("category_slug", category);
  if (city) query = query.ilike("city", city);

  const [{ data: channels }, { data: categories }] = await Promise.all([
    query,
    supabase.from("channel_categories").select("slug, name_fa").order("position"),
  ]);

  const rows = (channels ?? []) as ChannelCardRow[];
  const cats = categories ?? [];

  // Cities come from what is actually listed, not from the city table: a chip
  // that leads to an empty page is a dead end.
  const cities = [...new Set(rows.map((c) => c.city).filter(Boolean) as string[])].sort();

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      active
        ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
        : "border-[color:var(--line)] bg-white text-[color:var(--text)] hover:border-[color:var(--lajvard)]"
    }`;

  const withParam = (key: string, value: string | null) => {
    const params = new URLSearchParams();
    if (platform && key !== "platform") params.set("platform", platform);
    if (category && key !== "category") params.set("category", category);
    if (city && key !== "city") params.set("city", city);
    if (value) params.set(key, value);
    const qs = params.toString();
    return qs ? `/channels?${qs}` : "/channels";
  };

  const filtered = !!(platform || category || city);

  return (
    <PageShell currentPath="/channels" currentSection="home">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "کانال‌ها و گروه‌ها", url: "/channels" }])} />
      {rows.length ? (
        <JsonLd
          data={collectionLd({
            name: "کانال‌ها و گروه‌های فارسی‌زبان کانادا",
            path: "/channels",
            total: rows.length,
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

        {rows.length > 0 || filtered ? (
          <section className="mb-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link href={withParam("platform", null)} className={chip(!platform)}>هر دو</Link>
              {CHANNEL_PLATFORMS.map((p) => (
                <Link key={p} href={withParam("platform", p)} className={chip(platform === p)}>
                  {CHANNEL_PLATFORM_LABELS_FA[p as ChannelPlatform]}
                </Link>
              ))}
            </div>
            {cats.length ? (
              <div className="flex flex-wrap gap-2">
                <Link href={withParam("category", null)} className={chip(!category)}>همه موضوع‌ها</Link>
                {cats.map((c) => (
                  <Link key={c.slug} href={withParam("category", c.slug)} className={chip(category === c.slug)}>
                    {c.name_fa}
                  </Link>
                ))}
              </div>
            ) : null}
            {cities.length > 1 || city ? (
              <div className="flex flex-wrap gap-2">
                <Link href={withParam("city", null)} className={chip(!city)}>همه شهرها</Link>
                {cities.map((c) => (
                  <Link key={c} href={withParam("city", c)} className={chip(city?.toLowerCase() === c.toLowerCase())}>
                    {c}
                  </Link>
                ))}
              </div>
            ) : null}
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
                {fa(rows.length)} کانال و گروه · مرتب‌شده بر اساس تازگی، نه تعداد عضو
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
          </>
        )}
      </main>
    </PageShell>
  );
}

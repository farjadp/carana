// ============================================================================
// Source: app/channels/category/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: One subject, indexable on its own. «کانال‌های مهاجرت» is a thing people
//      search for; «کانال‌ها» is not.
//
//      Under /channels/category/ rather than /channels/[category] on purpose:
//      a bare second segment would collide with /channels/[slug], and a
//      channel slug that happened to read like a category would resolve to the
//      wrong page. That is the /jobs/[city] trap, avoided by construction.
// Env / Identity: Anon client; RLS decides visibility.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CHANNEL_CARD_COLUMNS, ChannelCard, type ChannelCardRow } from "@/components/channels/channel-card";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { collectionLd } from "@/lib/seo/entity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const fa = (n: number) => n.toLocaleString("fa-IR");

async function loadCategory(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("channel_categories")
    .select("slug, name_fa, description")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: "پیدا نشد" };
  return {
    title: `کانال‌ها و گروه‌های ${category.name_fa}`,
    description:
      category.description ??
      `کانال‌های تلگرام و گروه‌های واتس‌اپ فارسی‌زبان کانادا در موضوع ${category.name_fa}، با تاریخ آخرین فعالیت.`,
    alternates: { canonical: `/channels/category/${category.slug}` },
  };
}

export default async function ChannelCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("channels")
    .select(CHANNEL_CARD_COLUMNS)
    .eq("status", "published")
    .eq("category_slug", category.slug)
    .or(`confirm_by.is.null,confirm_by.gt.${new Date().toISOString()}`)
    .order("last_post_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const rows = (data ?? []) as ChannelCardRow[];

  return (
    <PageShell currentPath="/channels" currentSection="home">
      <JsonLd
        data={breadcrumbLd([
          { name: "خانه", url: "/" },
          { name: "کانال‌ها و گروه‌ها", url: "/channels" },
          { name: category.name_fa, url: `/channels/category/${category.slug}` },
        ])}
      />
      {rows.length ? (
        <JsonLd
          data={collectionLd({
            name: `کانال‌ها و گروه‌های ${category.name_fa}`,
            path: `/channels/category/${category.slug}`,
            total: rows.length,
            items: rows.map((c) => ({ name: c.title, path: `/channels/${c.slug}` })),
          })}
        />
      ) : null}

      <main className="page-main">
        <section className="mb-6">
          <p className="eyebrow">
            <Link href="/channels">کانال‌ها و گروه‌ها</Link>
          </p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)]">{category.name_fa}</h1>
          {category.description ? (
            <p className="mt-2 text-sm leading-8 text-[color:var(--muted-text)]">{category.description}</p>
          ) : null}
        </section>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--line)] bg-white px-6 py-10 text-center">
            <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">هنوز در این موضوع چیزی ثبت نشده.</h2>
            <Link href="/channels/submit" className="text-sm font-bold text-[color:var(--lajvard)]">
              اولین کانال این موضوع را ثبت کن
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-[color:var(--muted-text)]">{fa(rows.length)} مورد · مرتب‌شده بر اساس تازگی</p>
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

// ============================================================================
// Source: components/blog/business-posts.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Every business profile ends with three articles chosen for that
//      business — a different trio per profile, so two listings in the same
//      street do not carry the same three links, and a reader who lands on a
//      profile from Google has somewhere to go next.
//
//      The heading is decided by the data, not by hope. `suggestedPostsFor`
//      reports how many of the three actually matched the business on its city
//      or on the words of its category; when none did, the section says
//      «خواندنی‌های گوپلازا» instead of «مقالات مرتبط». Titling three
//      unrelated posts "related" is the same unbacked claim as a verified chip
//      on an unverified listing.
// Env / Identity: Server Component. Anon client; RLS shows published only.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

import { PostCard } from "@/components/blog/post-card";
import { listCategories, suggestedPostsFor } from "@/lib/blog/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function BusinessPosts({
  businessId,
  city,
  cityFa,
  categorySlug,
  categoryName,
}: {
  businessId: string;
  city?: string | null;
  cityFa?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const [{ posts, matched, reason }, cats] = await Promise.all([
    suggestedPostsFor(supabase, { seed: businessId, city, cityFa, categorySlug, n: 3 }),
    listCategories(supabase),
  ]);
  if (posts.length === 0) return null;

  const catName = new Map(cats.map((c) => [c.slug, c.name]));
  const related = matched > 0;

  // Say what the connection is, and only what it is. A post matched on the
  // city gets the city named; matched on the trade gets the trade named.
  const parts: string[] = [];
  if (reason?.city) parts.push(reason.city);
  if (reason?.topic && categoryName) parts.push(categoryName);
  const subtitle = related
    ? parts.length
      ? `خواندنی‌هایی درباره‌ی ${parts.join(" و ")}`
      : "مقاله‌هایی نزدیک به این کسب‌وکار"
    : "تازه‌ترین نوشته‌های گوپلازا درباره‌ی زندگی و کسب‌وکار ایرانی در کانادا";

  return (
    <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-14" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--annabi)]/8 px-3 py-1 text-[11px] font-black text-[color:var(--annabi)]">
              <Newspaper className="h-3 w-3" /> وبلاگ
            </span>
            <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
              {related ? "مقالات مرتبط" : "خواندنی‌های گوپلازا"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted-text)]">{subtitle}</p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--annabi)] hover:underline"
          >
            همه‌ی مقالات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              categoryName={p.category_slug ? catName.get(p.category_slug) : null}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

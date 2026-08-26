// ============================================================================
// Source: components/channels/home-channels.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The «کانال‌ها و گروه‌ها» band on the home page.
//
//      RETURNS NULL WHEN NOTHING IS PUBLISHED. On the day this ships the table
//      is empty, and a heading with nothing under it is the same broken
//      promise as a search box that does not search. Same rule as
//      HomeLatestPosts, for the same reason.
//
//      Shows the four freshest, not the four biggest. The band is an argument
//      that this section is alive; four dormant channels with large member
//      counts would be an argument against it.
// Env / Identity: Server Component. Anon client; RLS shows published only.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CHANNEL_CARD_COLUMNS, ChannelCard, type ChannelCardRow } from "@/components/channels/channel-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function HomeChannels() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("channels")
    .select(CHANNEL_CARD_COLUMNS)
    .eq("status", "published")
    .or(`confirm_by.is.null,confirm_by.gt.${new Date().toISOString()}`)
    .order("last_post_at", { ascending: false, nullsFirst: false })
    .limit(4);

  const rows = (data ?? []) as ChannelCardRow[];
  if (rows.length === 0) return null;

  return (
    <section className="border-t border-gray-100 bg-white px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Radio size={13} /> کانال‌ها و گروه‌ها
            </p>
            <h2 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">
              کانال‌های فارسی‌زبان کانادا
            </h2>
            {/* The band states the section's actual claim. Anyone can list
                links; the reason to open this one is the date beside each. */}
            <p className="mt-2 max-w-xl text-sm leading-8 text-[color:var(--muted-text)]">
              لینکش همه‌جا هست؛ این‌که هنوز زنده باشد نه. کنار هرکدام می‌نویسیم آخرین بار کِی پست
              گذاشته و ما کِی بررسی کرده‌ایم.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-[color:var(--lajvard)]">
            <Link href="/channels">
              همه‌ی کانال‌ها <ArrowLeft className="mr-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id}>
              <ChannelCard channel={c} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

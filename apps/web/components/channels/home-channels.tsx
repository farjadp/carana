// ============================================================================
// Source: components/channels/home-channels.tsx
// Version: 2.0.0 — 2026-08-26
// Why: The «کانال‌ها و گروه‌ها» band on the home page, in the slot the
//      «چرا پلازا؟» card grid used to hold (Farjad, 26 Aug).
//
//      That grid argued the site was trustworthy. This shows it: six real
//      channels, each with the date it last posted and the date we checked.
//      One is a claim about ourselves, the other is evidence, and the page
//      only has room for one of them.
//
//      TWO HONEST MODES, AND THE HEADING SAYS WHICH ONE. Normally the band
//      shows the freshest channels — rows with a real `last_post_at`, which in
//      practice means the public Telegram channels the daily cron can read.
//      When none of those exist yet it falls back to the most recently ADDED
//      entries and relabels itself, because calling a WhatsApp group with no
//      readable timestamp "recently active" would be the exact claim this
//      section was built to stop making.
//
//      RETURNS NULL WHEN NOTHING IS PUBLISHED AT ALL. On the day this ships
//      the table is empty, and a heading with nothing under it is the same
//      broken promise as a search box that does not search.
//
//      Sorted on freshness, never on member count: the band is an argument
//      that this section is alive, and four dormant channels with large
//      followings would be an argument against it.
// Env / Identity: Server Component. Anon client; RLS shows published only.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CHANNEL_CARD_COLUMNS, ChannelCard, type ChannelCardRow } from "@/components/channels/channel-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LIMIT = 6;

export async function HomeChannels() {
  const supabase = await createSupabaseServerClient();
  const live = `confirm_by.is.null,confirm_by.gt.${new Date().toISOString()}`;

  const base = () =>
    supabase.from("channels").select(CHANNEL_CARD_COLUMNS).eq("status", "published").or(live);

  // Freshest first, and only rows that can actually back the word "fresh".
  const { data: fresh } = await base()
    .not("last_post_at", "is", null)
    .order("last_post_at", { ascending: false })
    .limit(LIMIT);

  let rows = (fresh ?? []) as ChannelCardRow[];
  let mode: "fresh" | "new" = "fresh";

  if (rows.length === 0) {
    const { data: newest } = await base().order("created_at", { ascending: false }).limit(LIMIT);
    rows = (newest ?? []) as ChannelCardRow[];
    mode = "new";
  }

  if (rows.length === 0) return null;

  return (
    <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Radio size={13} /> کانال‌ها و گروه‌ها
            </p>
            <h2 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">
              {mode === "fresh" ? "کانال‌هایی که تازه پست گذاشته‌اند" : "تازه‌ترین کانال‌های ثبت‌شده"}
            </h2>
            {/* The band states the section's actual claim. Anyone can list
                links; the reason to open this one is the date beside each. */}
            <p className="mt-2 max-w-xl text-sm leading-8 text-[color:var(--muted-text)]">
              {mode === "fresh"
                ? "لینکش همه‌جا هست؛ این‌که هنوز زنده باشد نه. کنار هرکدام می‌نویسیم آخرین بار کِی پست گذاشته و ما کِی بررسی کرده‌ایم."
                : "تازه ثبت شده‌اند و هنوز آخرین فعالیتشان بررسی نشده. بررسی خودکار هر روز انجام می‌شود."}
            </p>
          </div>
          <Button asChild className="h-12 bg-[color:var(--lajvard)] px-6 text-sm font-bold text-white hover:opacity-90">
            <Link href="/channels">
              فهرست کامل کانال‌ها <ArrowLeft className="mr-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <ChannelCard channel={c} />
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-[color:var(--muted-text)]">
          در فهرست کامل می‌توانی بر اساس پلتفرم، موضوع، شهر و وضعیت فعالیت فیلتر کنی.{" "}
          <Link href="/channels/submit" className="font-bold text-[color:var(--lajvard)]">
            یا کانال خودت را ثبت کن
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

"use server";

// ============================================================================
// Source: lib/actions/channels.ts
// Version: 1.0.0 — 2026-08-26
// Why: Every write to `channels`. No RLS policy grants a regular user insert,
//      update or delete on that table (see 20260830410000_channels.sql) —
//      three of the decisions that govern an entry cannot be expressed in a
//      policy:
//        · the 24h rate limit, counted in the database via
//          channels_recent_count() rather than lib/utils/rate-limit.ts, which
//          lives in per-instance memory and resets on deploy (5c80228);
//        · whether the join URL resolves to a public Telegram username, which
//          is what decides `measured` vs `declared` — and must be DERIVED
//          here, never accepted from the client. A caller that can choose its
//          own metrics_source can call its own claims measurements;
//        · the confirmation window a declared row carries, which exists only
//          because the row is declared.
//      So this file is the gate, same shape as jobs and announcements.
// Env / Identity: Server-side, authenticated. Anyone signed in may submit —
//      owning a listing is deliberately not required, because most of these
//      channels have nothing to do with a business. Only an admin moderates.
// ============================================================================

import { revalidatePath } from "next/cache";

import {
  CHANNELS_PER_DAY,
  CHANNEL_DECLARED_DAYS,
  CHANNEL_DESCRIPTION_MAX,
  CHANNEL_DESCRIPTION_MIN,
  CHANNEL_KINDS,
  CHANNEL_LANGUAGES,
  CHANNEL_PLATFORMS,
  CHANNEL_TITLE_MAX,
  isValidJoinUrl,
  latinSlug,
  metricsSourceFor,
  telegramUsername,
  type ChannelKind,
  type ChannelLanguage,
  type ChannelPlatform,
} from "@goplaza/core";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export type ChannelInput = {
  title: string;
  description: string;
  platform: string;
  kind: string;
  language: string;
  categorySlug: string;
  city?: string | null;
  province?: string | null;
  joinUrl: string;
};

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * An English slug unique across the table.
 *
 * Same shape as uniqueSlug() in lib/actions/jobs.ts, including the numeric
 * suffix — half the directory will be «اخبار تورنتو». Falls back to "channel"
 * when transliteration yields nothing, which happens for a title that is pure
 * emoji.
 */
async function uniqueSlug(admin: Admin, title: string) {
  const base = latinSlug(title, 70) || "channel";
  const { data: taken } = await admin.from("channels").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug as string));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Trailing slash and casing removed, so two spellings of one link are one link. */
function canonicalJoinUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function submitChannel(input: ChannelInput) {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "برای ثبت کانال ابتدا وارد حساب کاربری شوید." };

    // ---- shape
    const platform = (CHANNEL_PLATFORMS as string[]).includes(input.platform)
      ? (input.platform as ChannelPlatform)
      : null;
    if (!platform) return { success: false, error: "پلتفرم نامعتبر است." };

    const kind = (CHANNEL_KINDS as string[]).includes(input.kind) ? (input.kind as ChannelKind) : null;
    if (!kind) return { success: false, error: "کانال است یا گروه؟" };

    const language = (CHANNEL_LANGUAGES as string[]).includes(input.language)
      ? (input.language as ChannelLanguage)
      : "fa";

    const title = input.title.trim().replace(/\s+/g, " ");
    if (title.length < 2) return { success: false, error: "نام کانال را بنویس." };
    if (title.length > CHANNEL_TITLE_MAX) {
      return { success: false, error: `نام نباید بیشتر از ${CHANNEL_TITLE_MAX} کاراکتر باشد.` };
    }

    const description = input.description.trim();
    if (description.length < CHANNEL_DESCRIPTION_MIN) {
      return { success: false, error: `توضیح خیلی کوتاه است — دست‌کم ${CHANNEL_DESCRIPTION_MIN} کاراکتر بنویس.` };
    }
    if (description.length > CHANNEL_DESCRIPTION_MAX) {
      return { success: false, error: `توضیح نباید بیشتر از ${CHANNEL_DESCRIPTION_MAX} کاراکتر باشد.` };
    }

    const joinUrl = canonicalJoinUrl(input.joinUrl);
    if (!isValidJoinUrl(platform, joinUrl)) {
      return {
        success: false,
        error:
          platform === "telegram"
            ? "لینک تلگرام معتبر نیست. چیزی مثل https://t.me/example یا لینک دعوت t.me/+… بگذار."
            : "لینک واتس‌اپ معتبر نیست. لینک دعوت گروه (chat.whatsapp.com/…) یا کانال واتس‌اپ را بگذار.",
      };
    }

    const admin = createSupabaseAdminClient();

    const { data: category } = await admin
      .from("channel_categories")
      .select("slug")
      .eq("slug", input.categorySlug)
      .maybeSingle();
    if (!category) return { success: false, error: "موضوع را انتخاب کن." };

    // ---- duplicates, said helpfully rather than as a constraint violation
    const username = telegramUsername(joinUrl);
    const { data: existing } = username
      ? await admin.from("channels").select("id, slug, status").eq("tg_username", username).maybeSingle()
      : await admin.from("channels").select("id, slug, status").eq("join_url", joinUrl).maybeSingle();
    if (existing) {
      return {
        success: false,
        error:
          existing.status === "published"
            ? "این کانال قبلاً ثبت شده است."
            : "این کانال قبلاً ثبت شده و در صف بررسی است.",
      };
    }

    // ---- abuse ceiling, counted in the database
    const { data: recent } = await admin.rpc("channels_recent_count", { p_user_id: user.id });
    if (typeof recent === "number" && recent >= CHANNELS_PER_DAY) {
      return { success: false, error: `در ۲۴ ساعت گذشته ${CHANNELS_PER_DAY} مورد ثبت کرده‌ای. فردا دوباره سر بزن.` };
    }

    // ---- THE AXIS. Derived from the URL, never taken from the caller.
    const metricsSource = metricsSourceFor(platform, joinUrl);
    const declared = metricsSource === "declared";

    const slug = await uniqueSlug(admin, title);

    const { error } = await admin.from("channels").insert({
      submitted_by: user.id,
      slug,
      platform,
      kind,
      title,
      description,
      language,
      category_slug: category.slug,
      city: input.city?.trim() || null,
      province: input.province?.trim() || null,
      join_url: joinUrl,
      tg_username: username,
      metrics_source: metricsSource,
      // A measured row must carry the date it was measured — the CHECK
      // constraint says so. Nothing has been measured yet at insert time, so
      // the row is stamped now and the first cron run replaces it with a real
      // reading. The alternative, inserting as `declared` and promoting later,
      // would mean the row lies about itself for up to a day.
      metrics_checked_at: declared ? null : new Date().toISOString(),
      // Declared rows expire; measured rows do not, because the daily check is
      // their proof.
      confirm_by: declared
        ? new Date(Date.now() + CHANNEL_DECLARED_DAYS * 86_400_000).toISOString()
        : null,
      // Everything queues. There is no verified-publishes-directly path here
      // the way there is for jobs: a job ad is attached to a listing we have
      // already checked, and a channel is attached to nothing at all.
      status: "pending_moderation",
    });
    if (error) {
      console.error("channels: insert failed", error);
      return { success: false, error: "ثبت کانال ناموفق بود." };
    }

    revalidatePath("/dashboard/channels");
    return { success: true, queued: true };
  } catch (e) {
    console.error("channels: submit failed", e);
    return { success: false, error: "ثبت کانال ناموفق بود." };
  }
}

/**
 * Publish or reject a queued entry.
 *
 * A rejection must carry a reason. The queue is the only quality control this
 * section has, and "rejected, no reason given" is not reviewable by the next
 * admin or explainable to the person who submitted it.
 */
export async function moderateChannel(channelId: string, decision: "published" | "rejected", reason?: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const adminUser = await requireAdmin(supabase);
    const note = (reason ?? "").trim().slice(0, 500);
    if (decision === "rejected" && note.length < 3) {
      return { success: false, error: "دلیل رد کردن را بنویس." };
    }

    const db = createSupabaseAdminClient();
    const { data: channel } = await db.from("channels").select("id, slug, status").eq("id", channelId).maybeSingle();
    if (!channel) return { success: false, error: "کانال پیدا نشد." };

    const { error } = await db
      .from("channels")
      .update({
        status: decision,
        moderation_reason: note || null,
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        // Set once. A re-publish after a suspension is not a new publication,
        // and overwriting this would make the entry look newer than it is.
        published_at: decision === "published" && channel.status !== "published" ? new Date().toISOString() : undefined,
      })
      .eq("id", channelId);
    if (error) {
      console.error("channels: moderation failed", error);
      return { success: false, error: "ثبت تصمیم ناموفق بود." };
    }

    revalidatePath("/admin/channels");
    revalidatePath("/channels");
    revalidatePath(`/channels/${channel.slug}`);
    return { success: true };
  } catch (e) {
    console.error("channels: moderate failed", e);
    return { success: false, error: "ثبت تصمیم ناموفق بود." };
  }
}

/**
 * The submitter says a declared entry is still there.
 *
 * Only the submitter, and only for a declared row — a measured row has no
 * confirmation window because the daily check is its proof, and letting anyone
 * push that date would turn the one guard on unverifiable rows into a button.
 */
export async function reconfirmChannel(channelId: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const db = createSupabaseAdminClient();
    const { data: channel } = await db
      .from("channels")
      .select("id, slug, submitted_by, metrics_source")
      .eq("id", channelId)
      .maybeSingle();
    if (!channel || channel.submitted_by !== user.id) {
      return { success: false, error: "این مورد را تو ثبت نکرده‌ای." };
    }
    if (channel.metrics_source !== "declared") {
      return { success: false, error: "این مورد خودکار بررسی می‌شود و نیازی به تأیید دستی ندارد." };
    }

    const { error } = await db
      .from("channels")
      .update({ confirm_by: new Date(Date.now() + CHANNEL_DECLARED_DAYS * 86_400_000).toISOString() })
      .eq("id", channelId);
    if (error) return { success: false, error: "تأیید ناموفق بود." };

    revalidatePath("/dashboard/channels");
    revalidatePath(`/channels/${channel.slug}`);
    return { success: true };
  } catch (e) {
    console.error("channels: reconfirm failed", e);
    return { success: false, error: "تأیید ناموفق بود." };
  }
}

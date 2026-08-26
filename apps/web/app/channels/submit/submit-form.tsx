// ============================================================================
// Source: app/channels/submit/submit-form.tsx
// Version: 1.1.0 — 2026-08-26 (the link field asks for an id, not a URL)
// Why: The submission form.
//
//      It asks for NO numbers. Not member count, not last-post date, not
//      "how active is it" — nothing a submitter could inflate. Either we can
//      measure a channel or we say we cannot; a third state, "the submitter
//      typed 40,000 members", is exactly the class of claim this section was
//      designed to stop printing.
//
//      What it does do is tell the submitter, before they press anything,
//      which of the two they are about to create. metricsSourceFor() is the
//      same function the server action uses to decide it, so the preview
//      cannot promise something the write then contradicts.
//
//      v1.1: THE FIELD ASKS FOR AN ID, NOT A URL. Nobody types `https://`.
//      For Telegram the input carries a `t.me/` prefix and takes `GoPlaza`,
//      `@GoPlaza`, or a whole pasted URL — normalizeJoinUrl() collapses all of
//      them, and the resolved address is shown underneath so nothing is
//      guessed silently. The same function runs again in the server action,
//      which is the boundary.
// Env / Identity: Client component. The action re-derives everything.
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import {
  CHANNEL_DESCRIPTION_MAX,
  CHANNEL_DESCRIPTION_MIN,
  CHANNEL_KINDS,
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_LANGUAGES,
  CHANNEL_LANGUAGE_LABELS_FA,
  CHANNEL_PLATFORMS,
  CHANNEL_PLATFORM_LABELS_FA,
  CHANNEL_TITLE_MAX,
  metricsSourceFor,
  normalizeJoinUrl,
  type ChannelKind,
  type ChannelLanguage,
  type ChannelPlatform,
} from "@goplaza/core";

import { submitChannel } from "@/lib/actions/channels";

const field =
  "h-11 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:border-[color:var(--lajvard)]/40 focus:bg-white";
const label = "mb-1 block text-xs font-bold text-[color:var(--text)]";

export function SubmitChannelForm({ categories }: { categories: { slug: string; name_fa: string }[] }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<ChannelPlatform>("telegram");
  const [kind, setKind] = useState<ChannelKind>("channel");
  const [language, setLanguage] = useState<ChannelLanguage>("fa");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [city, setCity] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // One resolved value drives everything below: the validity hint, the
  // measured/declared preview, and what gets submitted.
  const resolvedUrl = useMemo(() => normalizeJoinUrl(platform, joinUrl), [platform, joinUrl]);
  const urlLooksRight = joinUrl.trim() ? resolvedUrl !== null : null;

  // Said before the submission, not after. Somebody who wants their numbers
  // measured can go and switch their channel's preview on and come back.
  const preview = useMemo(
    () => (resolvedUrl ? metricsSourceFor(platform, resolvedUrl) : null),
    [platform, resolvedUrl],
  );

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    const res = await submitChannel({
      title,
      description,
      platform,
      kind,
      language,
      categorySlug,
      city: city || null,
      joinUrl,
    });
    setSending(false);
    if (!res.success) {
      setError(res.error ?? "ثبت ناموفق بود.");
      return;
    }
    setDone(true);
    router.refresh();
  };

  if (done) {
    return (
      <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white p-6 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-[color:var(--success,#0f7b4f)]" />
        <h2 className="text-lg font-black text-[color:var(--text)]">ثبت شد و در صف بررسی است</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-8 text-[color:var(--muted-text)]">
          یک نفر آن را می‌بیند و بعد منتشر می‌شود. تا آن موقع در «کانال‌های من» می‌بینی‌اش.
        </p>
        <a href="/dashboard/channels" className="mt-5 inline-block text-sm font-bold text-[color:var(--lajvard)]">
          کانال‌های من
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-[color:var(--line)] bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>پلتفرم</span>
          <div className="flex gap-2">
            {CHANNEL_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  platform === p
                    ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
                    : "border-[color:var(--line)] text-[color:var(--text)]"
                }`}
              >
                {CHANNEL_PLATFORM_LABELS_FA[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>کانال است یا گروه؟</span>
          <div className="flex gap-2">
            {CHANNEL_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  kind === k
                    ? "border-[color:var(--lajvard)] bg-[color:var(--lajvard)] text-white"
                    : "border-[color:var(--line)] text-[color:var(--text)]"
                }`}
              >
                {CHANNEL_KIND_LABELS_FA[k]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block">
        <span className={label}>نام</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={CHANNEL_TITLE_MAX} className={field} />
      </label>

      <label className="block">
        <span className={label}>{platform === "telegram" ? "آیدی کانال یا گروه" : "لینک دعوت"}</span>
        {platform === "telegram" ? (
          // The prefix is the whole point: it makes the shape of the answer
          // obvious without making anyone type it. A pasted full URL still
          // works — normalizeJoinUrl strips the host back off.
          <span className="flex h-11 w-full items-center overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] focus-within:border-[color:var(--lajvard)]/40 focus-within:bg-white">
            <span
              dir="ltr"
              className="shrink-0 border-e border-[color:var(--line)] px-3 text-sm text-[color:var(--muted-text)]"
              style={{ fontFamily: "var(--font-latin)" }}
            >
              t.me/
            </span>
            <input
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              dir="ltr"
              placeholder="GoPlaza"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
            />
          </span>
        ) : (
          <input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            dir="ltr"
            placeholder="chat.whatsapp.com/…"
            className={field}
          />
        )}

        {urlLooksRight === false ? (
          <span className="mt-1 block text-xs font-bold text-[color:var(--annabi)]">
            {platform === "telegram"
              ? "آیدی معتبر نیست. فقط آیدی کانال را بنویس — مثل GoPlaza — یا لینک دعوت +… را بگذار."
              : "لینک واتس‌اپ معتبر نیست. لینک دعوت گروه یا لینک کانال را کامل بگذار."}
          </span>
        ) : null}

        {/* What will actually be stored, shown before it is. Nothing about a
            link should be guessed on somebody's behalf without saying so. */}
        {resolvedUrl ? (
          <span dir="ltr" className="mt-1 block text-xs text-[color:var(--muted-text)]" style={{ fontFamily: "var(--font-latin)" }}>
            {resolvedUrl}
          </span>
        ) : null}

        {preview === "measured" ? (
          <span className="mt-1 block text-xs leading-6 text-[color:var(--muted-text)]">
            این آیدی عمومی است، پس تعداد اعضا و آخرین فعالیتش را هر روز خودمان بررسی می‌کنیم.
          </span>
        ) : null}
        {preview === "declared" ? (
          <span className="mt-1 block text-xs leading-6 text-[color:var(--muted-text)]">
            این لینک آیدی عمومی ندارد، پس هیچ عددی برایش نمایش نمی‌دهیم و هر ۹۰ روز باید خودت تأیید
            کنی که هنوز هست. اگر کانال عمومی داری، آیدی‌اش را بگذار.
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className={label}>
          توضیح ({description.trim().length.toLocaleString("fa-IR")} از {CHANNEL_DESCRIPTION_MIN.toLocaleString("fa-IR")})
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={CHANNEL_DESCRIPTION_MAX}
          placeholder="این کانال درباره چیست و به درد چه کسی می‌خورد؟"
          className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-2 text-sm leading-7 outline-none focus:border-[color:var(--lajvard)]/40 focus:bg-white"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={label}>موضوع</span>
          <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={field}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name_fa}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>شهر (اختیاری)</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="تورنتو" className={field} />
        </label>
        <label className="block">
          <span className={label}>زبان</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as ChannelLanguage)} className={field}>
            {CHANNEL_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {CHANNEL_LANGUAGE_LABELS_FA[l]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-sm font-bold text-[color:var(--annabi)]">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-5 text-[color:var(--muted-text)]">
          هیچ عددی از تو نمی‌پرسیم — یا خودمان می‌سنجیم یا می‌گوییم که نتوانستیم.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={sending || !title.trim() || !urlLooksRight}
          className="h-11 shrink-0 rounded-full bg-[color:var(--lajvard)] px-6 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {sending ? "در حال ثبت…" : "ثبت برای بررسی"}
        </button>
      </div>
    </div>
  );
}

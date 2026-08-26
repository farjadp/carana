"use client";

// ============================================================================
// Source: components/business/short-link-box.tsx
// Version: 1.0.0 — 2026-08-25
// Why: A profile URL is a Persian slug that survives being pasted into a
//      browser and almost nothing else. It does not survive an SMS, a
//      printed card, or an Instagram bio with 150 characters. This gives
//      every listing a short one on `gplz.link`.
//
//      IT WORKS FOR EVERY BUSINESS, not only the ones with a link page,
//      because it is built from the reference number — which is assigned by a
//      trigger on insert and therefore always exists. `/b/[slug]` resolves a
//      handle first and a ref number second, so this box needs nothing to be
//      set up and cannot show a link that does not resolve.
//
//      WHEN A LIVE BIO PAGE EXISTS, IT IS OFFERED TOO, and labelled as what
//      it is — a different destination, not a prettier spelling of the same
//      one. `gplz.link/b/4821` lands on this profile; `gplz.link/kababsara`
//      lands on the bio page. Presenting them as interchangeable would be the
//      kind of small lie this project keeps finding and removing.
// Env / Identity: Client, for the clipboard. Takes what the server already
//      resolved; performs no lookup of its own.
// ============================================================================
import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

import { bioUrl, bioUrlDisplay, shortLink } from "@goplaza/core";

function CopyRow({ href, display, label }: { href: string; display: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div>
      {label && <span className="mb-1 block text-[11px] text-[color:var(--muted-text)]">{label}</span>}
      <button
        type="button"
        dir="ltr"
        title="کپی"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(href);
            setCopied(true);
            toast.success("لینک کپی شد");
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard access can be refused — over http, or by a permission
            // policy. Say so instead of showing a success toast for something
            // that did not happen.
            toast.error("کپی نشد — لینک را دستی بردارید.");
          }
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-[color:var(--bg)] px-3 py-2.5 text-left transition hover:bg-[color:var(--line)]"
      >
        <span className="truncate text-[13px] font-black text-[color:var(--text)] [font-family:var(--font-latin)]">
          {display}
        </span>
        {copied ? (
          <Check size={14} className="shrink-0 text-emerald-600" />
        ) : (
          <Copy size={14} className="shrink-0 opacity-50" />
        )}
      </button>
    </div>
  );
}

export function ShortLinkBox({ refNo, liveHandle }: { refNo: number; liveHandle?: string | null }) {
  const profile = shortLink("b", refNo);

  return (
    <div className="space-y-3 text-xs">
      <CopyRow
        href={profile}
        display={profile.replace(/^https?:\/\//, "")}
        label={liveHandle ? "لینک کوتاه این صفحه" : undefined}
      />

      {liveHandle && (
        <CopyRow href={bioUrl(liveHandle)} display={bioUrlDisplay(liveHandle)} label="صفحه‌ی لینک این کسب‌وکار" />
      )}

      <p className="text-[11px] leading-5 text-[color:var(--muted-text)]">
        <Link2 size={11} className="ml-1 inline" />
        کوتاه‌تر از آدرس کامل — برای پیامک، بیوی اینستاگرام و کارت ویزیت.
      </p>
    </div>
  );
}

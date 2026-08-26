// ============================================================================
// Source: app/channels/[slug]/join-button.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The one action on a channel page, and the one number in this section
//      that is wholly ours. Joining happens off-site; the click is recorded
//      before the browser leaves, which is what makes «۱۲ نفر از این‌جا عضو
//      شدند» a measurement rather than a guess.
//
//      The view is recorded here too, from the same component, so a page that
//      renders its button has recorded its visit — the two cannot drift apart
//      into a click count higher than the view count.
//
//      rel="noreferrer nofollow ugc": the destination is user-submitted, and
//      we do not pass our readers' referrer to it or vouch for it to Google.
// Env / Identity: Client. The URL is public and already on the page; nothing
//      here is hidden behind the click.
// ============================================================================
"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";

async function record(channelId: string, type: "channel_view" | "channel_join_click") {
  try {
    await fetch("/api/channels/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, type }),
      // The click navigates away immediately; without keepalive the request is
      // cancelled with the page and the join is never counted.
      keepalive: true,
    });
  } catch {
    // Telemetry must never break the page it is measuring.
  }
}

export function JoinButton({
  channelId,
  joinUrl,
  label,
}: {
  channelId: string;
  joinUrl: string;
  label: string;
}) {
  useEffect(() => {
    void record(channelId, "channel_view");
  }, [channelId]);

  return (
    <a
      href={joinUrl}
      target="_blank"
      rel="noreferrer nofollow ugc"
      dir="ltr"
      onClick={() => void record(channelId, "channel_join_click")}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--lajvard)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 sm:w-auto"
    >
      <ExternalLink size={16} />
      <span dir="rtl">{label}</span>
    </a>
  );
}

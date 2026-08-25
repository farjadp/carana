"use client";

// ============================================================================
// Source: app/link/[handle]/tracker.tsx
// Version: 1.0.0 — 2026-08-25
// Why: The only client-side code on the bio page. It reports one view on
//      mount and one click per tap, and nothing else.
//
//      WHY NOT COUNT THE VIEW ON THE SERVER, during render. The page sets
//      `revalidate = 60`, so most visitors are served a cached render and the
//      component never runs for them — server-side counting would quietly
//      undercount by however much the cache hit rate is. A beacon fires per
//      visitor regardless of the cache.
//
//      It sends only `pageId`, `itemId` and a type. Referrer, device, city and
//      the visitor hash are all derived from the request on the server, where
//      the caller cannot choose them.
//
//      Clicks are handled by ONE delegated listener rather than a handler per
//      link, and use `sendBeacon`, which survives the page being unloaded by
//      the navigation the click just started — a `fetch` here races the
//      unload and loses often enough to matter, and losing exactly the clicks
//      that worked would bias the numbers toward the links nobody uses.
//
//      The strict-mode double mount in development would report two views;
//      the ref guards that. The server also rate-limits, so a duplicate is
//      absorbed either way.
// Env / Identity: Client. Sends no personal data — it has none to send.
// ============================================================================
import { useEffect, useRef } from "react";

const ENDPOINT = "/api/link/event";

function send(payload: { pageId: string; itemId?: string | null; type: string }) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    return;
  }
  // Older Safari has no sendBeacon on some versions; keepalive is the fallback
  // that also survives unload.
  void fetch(ENDPOINT, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(
    () => {},
  );
}

export function LinkPageTracker({ pageId }: { pageId: string }) {
  const reported = useRef(false);

  useEffect(() => {
    // The once-guard covers the VIEW only. It used to sit at the top of the
    // effect as an early return, which meant that on the second mount — React
    // strict mode does this in development, and a remount can happen in
    // production too — the function returned before reaching the line below
    // and the click listener was never re-attached. Views were recorded and
    // clicks silently were not, which is the worst shape for this bug: the
    // number that exists looks fine, and the one that is missing looks like
    // nobody tapped anything.
    if (!reported.current) {
      reported.current = true;
      send({ pageId, type: "link_view" });
    }

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-link-item]");
      if (!target) return;
      send({ pageId, itemId: target.dataset.linkItem || null, type: "link_click" });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pageId]);

  return null;
}

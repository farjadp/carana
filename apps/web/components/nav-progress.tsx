// ============================================================================
// Source: components/nav-progress.tsx
// Version: 1.0.0 — 2026-08-27
// Why: What `app/loading.tsx` was actually for, without what it cost.
//
//      A root-level loading.tsx wraps the WHOLE app in a Suspense boundary, so
//      every response starts streaming before the page has resolved. Next then
//      cannot set the status any more — so every notFound() in this codebase
//      answered HTTP 200, and the not-found page's own <title> («صفحه پیدا
//      نشد») never made it into the document either, because the head had
//      already been flushed. Documented behaviour, not a bug in Next:
//      node_modules/next/dist/docs, 03-file-conventions/loading.md → "Status
//      codes". Removing that file is what makes the 404s real; this component
//      is what keeps navigation from feeling frozen without it.
//
//      There are no router events in the App Router, so this watches what it
//      can: a same-document link click starts the bar, and the bar ends when
//      the address actually changes. It watches `location.href` rather than
//      usePathname(), because the most-used links on this site — the sort,
//      filter and pager on /businesses — change only the QUERY STRING, and a
//      pathname-only check would leave the bar running on every one of them.
//      usePathname() cannot see the query, and useSearchParams() would put a
//      Suspense boundary back into the root layout, which is the very thing
//      being removed here.
// Env / Identity: Client component, mounted once in the root layout. Reads no
//      data and stores nothing.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";

/** Below this, a navigation is not worth announcing — the bar would flash. */
const SHOW_AFTER_MS = 150;
/** How often to check whether the address has changed. */
const POLL_MS = 100;
/** A navigation still unresolved by now gets its bar taken away regardless,
 *  rather than leaving one running forever on a request that died. */
const GIVE_UP_MS = 15000;

export function NavProgress() {
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    timers.current = [];
  };

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Anything the browser handles itself is not our navigation.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download") || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const from = window.location.href;
      // The same address is not a navigation. A bare hash change is not one
      // either — the browser resolves it without asking the server.
      if (url.href === from) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      stop();
      timers.current.push(window.setTimeout(() => setVisible(true), SHOW_AFTER_MS));
      timers.current.push(
        window.setInterval(() => {
          if (window.location.href !== from) {
            stop();
            setVisible(false);
          }
        }, POLL_MS),
      );
      timers.current.push(
        window.setTimeout(() => {
          stop();
          setVisible(false);
        }, GIVE_UP_MS),
      );
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      stop();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="nav-progress" role="status" aria-live="polite">
      <span className="nav-progress-bar" />
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}

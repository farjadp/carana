// ============================================================================
// Source: components/blog/posts-rail.tsx
// Version: 1.1.0 — 2026-08-24 (manual tween; native smooth scroll is cancelled)
// Why: The home page shows ten posts as a horizontal rail, 3–4 in view at a
//      time. Touch and trackpads scroll it natively; this client shell only
//      adds the two arrow buttons a mouse needs, and hides each arrow when
//      that end of the rail is reached. The cards themselves are passed in as
//      children, so they stay server-rendered.
//
//      The arrows do NOT use scrollBy({behavior:"smooth"}): on this RTL
//      snap container Chrome cancels every programmatic smooth scroll (the
//      position read back unchanged even a second later, while a direct
//      scrollLeft assignment sticks — verified in the browser, 24 Aug). So
//      the animation is a small rAF tween of scrollLeft, stepped in whole
//      cards so the end position agrees with scroll-snap instead of fighting
//      it.
// Env / Identity: Client Component, no data access.
// ============================================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PostsRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  // The rail's resting scrollLeft is not 0: RTL plus the -mx-4/px-4 bleed
  // leave it a padding-width off. Every edge test is relative to this.
  const base = useRef(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const travelled = Math.abs(el.scrollLeft - base.current);
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(travelled < 24);
    setAtEnd(travelled > max - 24);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    base.current = el.scrollLeft;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf.current);
    };
  }, [update]);

  // Visual direction: +1 = rightwards on screen, same convention as scrollBy.
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 20;
    const step = card.offsetWidth + gap;
    const cards = Math.max(1, Math.floor(el.clientWidth / step));

    const start = el.scrollLeft;
    // RTL: scrollLeft runs from ~0 down to -(scrollWidth - clientWidth).
    const min = Math.min(base.current, base.current - (el.scrollWidth - el.clientWidth));
    const max = Math.max(base.current, base.current + (el.scrollWidth - el.clientWidth));
    const target = Math.min(max, Math.max(min, start + dir * step * cards));

    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const DURATION = 380;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      el.scrollLeft = start + (target - start) * ease(p);
      if (p < 1) raf.current = requestAnimationFrame(frame);
      else update();
    };
    raf.current = requestAnimationFrame(frame);
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2"
      >
        {children}
      </div>

      {/* Arrows: desktop only — a touch rail scrolls itself. The rail is RTL,
          so its start is the RIGHT edge; the right arrow goes back to newer
          posts and the left arrow onwards to older ones. */}
      {!atStart ? (
        <RailArrow side="right" onClick={() => nudge(1)} label="مقاله‌های قبلی">
          <ChevronRight className="h-5 w-5" />
        </RailArrow>
      ) : null}
      {!atEnd ? (
        <RailArrow side="left" onClick={() => nudge(-1)} label="مقاله‌های بیشتر">
          <ChevronLeft className="h-5 w-5" />
        </RailArrow>
      ) : null}
    </div>
  );
}

function RailArrow({
  side,
  onClick,
  label,
  children,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--text)] shadow-[0_10px_28px_rgba(20,33,61,0.14)] transition hover:border-[color:var(--annabi)]/40 hover:text-[color:var(--annabi)] md:flex ${
        side === "left" ? "-left-2 lg:-left-5" : "-right-2 lg:-right-5"
      }`}
    >
      {children}
    </button>
  );
}

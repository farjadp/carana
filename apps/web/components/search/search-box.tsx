// ============================================================================
// Source: components/search/search-box.tsx
// Version: 1.0.0 — 2026-09-09
// Why: The one search control, with suggestions. Until now the home hero and
//      the results page each had their own inline <form> and neither did
//      anything until submit — on a directory of ~9,700 listings, that made
//      every misspelling cost a full page load.
//
//      What it does that the two inline forms did not:
//        · Suggests while you type (/api/suggest), in three groups —
//          business, category, city — so «دندانپزشک» offers the category page
//          and «ونکوور» offers the city page, instead of pretending both are
//          business-name queries.
//        · Keyboard-navigable: ↑/↓ move, Enter opens the highlighted item,
//          Esc closes the list and keeps the typed text. Announced as a
//          combobox so a screen reader gets the same behaviour.
//        · Persian city labels with real counts, not the raw English
//          `businesses.city` values the old dropdown listed on an RTL page.
//        · Shows a preselected city as a removable chip. A filter the visitor
//          did not choose must be visible and one click from gone.
//
//      Every suggestion is a real row: businesses come from the same
//      search_businesses RPC the results page runs, cities and categories from
//      the cached indexes with their counts. Nothing here can invent a match.
// Env / Identity: Client component. Talks only to /api/suggest.
// ============================================================================
"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, LayoutGrid, MapPin, Search, X } from "lucide-react";

import { faNumber } from "@goplaza/core";

export type CityOption = { value: string; label: string; count: number };

type Suggestion = {
  kind: "business" | "category" | "city";
  label: string;
  hint: string | null;
  href: string;
};

const GROUP_ICON = {
  business: Building2,
  category: LayoutGrid,
  city: MapPin,
} as const;

/** Long enough that a fast typist sends one request per word, not per letter. */
const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

export function SearchBox({
  cities,
  defaultQuery = "",
  defaultCity = "",
  /** Set when `defaultCity` came from the edge rather than from the visitor. */
  cityWasDetected = false,
  placeholder = "دنبال چه کسی می‌گردی؟ مثلاً وکیل مهاجرت",
  autoFocus = false,
  tone = "light",
  extraParams,
}: {
  cities: CityOption[];
  defaultQuery?: string;
  defaultCity?: string;
  cityWasDetected?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** "light" sits on a dark hero; "plain" sits on the page ground. */
  tone?: "light" | "plain";
  /**
   * Filters the host page already has in its URL — category, verified — that a
   * new search must not silently drop. The results page passes its own; the
   * hero has none.
   */
  extraParams?: Record<string, string | null | undefined>;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultQuery);
  const [city, setCity] = useState(defaultCity);
  // Results are stored WITH the term they answer, and read back only when the
  // term still matches. That is what keeps stale suggestions for "وک" off the
  // screen while "وکیل" is in flight, without a setState in the effect body
  // (react-hooks/set-state-in-effect) that would cascade a render per keystroke.
  const [result, setResult] = useState<{ term: string; items: Suggestion[] }>({ term: "", items: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // The chip only claims "detected" while the value is still the detected one.
  const showDetectedChip = cityWasDetected && city === defaultCity && !!defaultCity;
  const cityLabel = useMemo(
    () => cities.find((c) => c.value === city)?.label ?? city,
    [cities, city]
  );

  const term = q.trim();
  // Only the list for the term currently in the box is ever shown.
  const items = result.term === term ? result.items : [];
  // …and a highlight can never point past the list it was set against.
  const activeIndex = active < items.length ? active : -1;

  // Debounced fetch. Each run owns an AbortController, so a slow response for
  // "وک" cannot land after the one for "وکیل".
  useEffect(() => {
    if (term.length < MIN_CHARS) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setResult({ term, items: data.suggestions ?? [] });
        setActive(-1);
      } catch {
        // Aborted or offline. The form still submits; suggestions are a
        // convenience layer and must never block the actual search.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // Click-away closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) return go(items[activeIndex].href);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (city) sp.set("city", city);
    for (const [k, v] of Object.entries(extraParams ?? {})) if (v) sp.set(k, v);
    go(`/search${sp.toString() ? `?${sp}` : ""}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    }
  };

  const listOpen = open && term.length >= MIN_CHARS && items.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={submit}
        className={`flex flex-col gap-2 rounded-2xl bg-white p-2 text-right md:flex-row ${
          tone === "light"
            ? "shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
            : "border border-[color:var(--line)] shadow-[0_18px_50px_rgba(20,33,61,0.10)]"
        }`}
        role="search"
      >
        <label className="flex flex-1 items-center gap-2 px-3">
          <Search size={18} className="shrink-0 text-[color:var(--annabi)]" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-transparent py-3.5 text-[15px] text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted-text)]"
            aria-label="جستجو"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
          />
        </label>

        <label className="flex items-center gap-2 px-3 md:w-56 md:border-r md:border-[color:var(--line)]">
          <MapPin size={18} className="shrink-0 text-[color:var(--lajvard)]" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-transparent py-3.5 text-[15px] text-[color:var(--text)] outline-none"
            aria-label="شهر"
          >
            <option value="">همه‌ی شهرها</option>
            {cities.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({faNumber(c.count)})
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[color:var(--annabi)] font-bold text-[#f6f1e8] transition hover:bg-[#5A1124] md:px-8"
        >
          جستجو <ArrowLeft size={16} />
        </button>
      </form>

      {/* The detected city, stated and removable. */}
      {showDetectedChip ? (
        <p
          className={`mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs ${
            tone === "light" ? "text-[#f6f1e8]/70" : "text-[color:var(--muted-text)]"
          }`}
        >
          <MapPin size={13} className="shrink-0" />
          <span>
            بر اساس موقعیت شبکه‌ات، جستجو در <b className="font-bold">{cityLabel}</b> شروع می‌شود.
          </span>
          <button
            type="button"
            onClick={() => setCity("")}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition ${
              tone === "light"
                ? "bg-white/10 text-[#f6f1e8] hover:bg-white/20"
                : "bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--line)]"
            }`}
          >
            <X size={11} /> همه‌ی کانادا
          </button>
        </p>
      ) : null}

      {/* Suggestions. Absolutely positioned so the hero does not jump. */}
      {listOpen ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="پیشنهادها"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white text-right shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
        >
          {items.map((s, i) => {
            const Icon = GROUP_ICON[s.kind];
            return (
              <li key={`${s.kind}-${s.href}`}>
                <button
                  id={`${listId}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-right transition ${
                    i === activeIndex ? "bg-[color:var(--bg)]" : "bg-white"
                  }`}
                >
                  <Icon size={15} className="shrink-0 text-[color:var(--annabi)]" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[color:var(--text)]">
                    {s.label}
                  </span>
                  {s.hint ? (
                    <span className="shrink-0 text-[11px] text-[color:var(--muted-text)]">{s.hint}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

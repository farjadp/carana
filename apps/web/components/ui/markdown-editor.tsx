// ============================================================================
// Source: components/ui/markdown-editor.tsx
// Version: 1.1.0 — 2026-08-18 (caret survives the re-render; line actions work on lines)
// Why: A structured description field without a rich-text editor. A job ad
//      needs «وظایف»، «شرایط» and a bullet list; one bare textarea produces a
//      wall of text nobody reads.
//
//      It is a Markdown textarea with a toolbar and a preview tab, NOT a
//      contenteditable WYSIWYG, for two reasons:
//        · Security. What leaves this component is Markdown, never HTML, so
//          no owner-authored markup is ever handed to a browser. The
//          renderer (react-markdown, no rehype-raw) treats raw HTML as
//          literal text, which is the second line rather than the first.
//        · RTL. contenteditable with mixed Persian and Latin, Persian digits
//          and a Persian keyboard is a known source of caret and
//          selection bugs; a textarea has none of them.
//
// Env / Identity: Client. Pure input — it holds no secrets and calls nothing.
// ============================================================================
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Heading3, Italic, List, ListOrdered, Quote } from "lucide-react";

import { normalizeJobMarkdown } from "@goplaza/core";

type Action = { icon: typeof Bold; label: string; wrap?: string; prefix?: string; ordered?: boolean };

const ACTIONS: Action[] = [
  { icon: Bold, label: "پررنگ", wrap: "**" },
  { icon: Italic, label: "مورب", wrap: "*" },
  { icon: Heading3, label: "عنوان بخش", prefix: "### " },
  { icon: List, label: "فهرست", prefix: "- " },
  { icon: ListOrdered, label: "فهرست شماره‌دار", prefix: "1. ", ordered: true },
  { icon: Quote, label: "نقل‌قول", prefix: "> " },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  maxLength,
  /** Rendered under the toolbar — used for the AI button, so it sits with the other tools. */
  toolbarExtra,
  /** Free-text hint under the field, e.g. the character count. */
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  toolbarExtra?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Where the caret should land once React has committed the new value.
  //
  // It cannot be set inside the click handler: onChange re-renders the
  // textarea, and React restores its own selection afterwards, which put the
  // caret back at 0 and sent the next keystroke to the top of the field.
  // useLayoutEffect runs after the commit and before paint, so the caret never
  // visibly moves.
  // A ref, not state: setting state inside the effect that consumes it is a
  // cascading render, and there is nothing to render here anyway — the caret
  // is a property of a DOM node, not part of the UI's data.
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(caret, caret);
  }, [value]);

  /**
   * Apply a toolbar action to the current selection.
   *
   * Line prefixes («- », «1. », «### », «> ») operate on whole lines: the
   * selection is first widened to the line boundaries around it. Without that,
   * pressing «فهرست» with the caret at the end of a sentence produced
   * «…لازم است.- » — a bullet marker stranded mid-line, which is not a list
   * and does not render as one.
   *
   * Selecting three lines and pressing «فهرست» gives three bullets, which is
   * the only reason a toolbar beats typing the syntax by hand.
   */
  const apply = (action: Action) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (action.wrap) {
      const selected = value.slice(start, end);
      const replacement = selected
        ? `${action.wrap}${selected}${action.wrap}`
        : `${action.wrap}${action.wrap}`;
      const next = value.slice(0, start) + replacement + value.slice(end);
      if (maxLength && next.length > maxLength) return;
      onChange(next);
      // Inside the markers when nothing was selected, after the text when
      // something was — either way, where a person would keep typing.
      pendingCaret.current = selected ? start + replacement.length : start + action.wrap.length;
      return;
    }

    // Widen to whole lines.
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, lineEnd);

    const replacement = block
      .split("\n")
      .map((line, i) => {
        // Pressing the same button twice removes its prefix, so a mis-click is
        // one click to undo rather than a hunt through the text.
        const existing = action.ordered ? /^\d+\.\s/ : new RegExp(`^${action.prefix!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        if (existing.test(line)) return line.replace(existing, "");
        return `${action.ordered ? `${i + 1}. ` : action.prefix}${line}`;
      })
      .join("\n");

    const next = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
    if (maxLength && next.length > maxLength) return;
    onChange(next);
    pendingCaret.current = lineStart + replacement.length;
  };

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition ${
      active ? "bg-[color:var(--lajvard)] text-white" : "text-[color:var(--muted-text)] hover:bg-[color:var(--bg)]"
    }`;

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--line)] p-2">
        <button type="button" onClick={() => setTab("write")} className={tabClass(tab === "write")}>نوشتن</button>
        <button type="button" onClick={() => setTab("preview")} className={tabClass(tab === "preview")}>پیش‌نمایش</button>

        <span className="mx-1 h-5 w-px bg-[color:var(--line)]" />

        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              title={action.label}
              aria-label={action.label}
              disabled={tab === "preview"}
              onClick={() => apply(action)}
              className="rounded-lg p-1.5 text-[color:var(--muted-text)] transition hover:bg-[color:var(--bg)] hover:text-[color:var(--text)] disabled:opacity-40"
            >
              <Icon size={15} />
            </button>
          );
        })}

        {toolbarExtra ? <span className="ms-auto flex items-center gap-2">{toolbarExtra}</span> : null}
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent p-3 text-sm leading-loose outline-none"
        />
      ) : (
        // Previewed through the same normaliser the server applies, so what
        // is shown here is what will actually be stored — not a friendlier
        // version of it that quietly loses a link on submit.
        <div className="job-md min-h-[8rem] p-3 text-sm leading-loose">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeJobMarkdown(value)}</ReactMarkdown>
          ) : (
            <p className="text-[color:var(--muted-text)]">چیزی برای پیش‌نمایش نیست.</p>
          )}
        </div>
      )}

      {hint ? <div className="border-t border-[color:var(--line)] px-3 py-2 text-[11px] text-[color:var(--muted-text)]">{hint}</div> : null}
    </div>
  );
}

/**
 * Read-only render of a stored job description.
 *
 * Normalises again on the way out. The value was normalised before it was
 * stored, so this is redundant by design: a row written by an older build, a
 * direct database edit or a future import must not be able to put anything
 * through that today's write path would have refused.
 */
export function JobMarkdown({ children }: { children: string }) {
  return (
    <div className="job-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeJobMarkdown(children)}</ReactMarkdown>
    </div>
  );
}

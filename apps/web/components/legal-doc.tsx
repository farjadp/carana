// ============================================================================
// Source: apps/web/components/legal-doc.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Shared layout for legal documents so privacy, terms and the rest read
//      consistently and stay easy to revise.
// Env / Identity: Presentational.
// ============================================================================
import type { ReactNode } from "react";

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="legal-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalMeta({ updated }: { updated: string }) {
  return <p className="legal-meta">آخرین بروزرسانی: {updated}</p>;
}

/**
 * Anchored table of contents. These documents are long by necessity — a
 * reader looking for the refund rule should not have to scroll past sixteen
 * headings to find it. Ids must match the `id` given to each LegalSection.
 */
export function LegalToc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="legal-toc" aria-label="فهرست مطالب">
      <h2 className="legal-toc-title">فهرست مطالب</h2>
      <ol className="legal-toc-list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * A boxed statement for the handful of lines that carry the most weight —
 * the summary at the top, the auto-renewal rule, what the verification badge
 * does not mean. Used sparingly; a document where everything is highlighted
 * highlights nothing.
 */
export function LegalCallout({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="legal-callout">
      {title ? <strong className="legal-callout-title">{title}</strong> : null}
      <div className="legal-callout-body">{children}</div>
    </aside>
  );
}

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

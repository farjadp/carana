// ============================================================================
// Source: components/admin/pagination.tsx
// Version: 1.0.0 — 2026-08-25
// Why: Every admin list was unpaginated. Two different failures hid behind
//      that: the lists with a `.limit(N)` silently stopped at N, and
//      /admin/listings had no limit at all — which does not mean "everything",
//      because PostgREST caps an unbounded select at 1,000 rows with no error.
//      The admin was reading 1,000 of 10,683 businesses and had no way to know.
//
//      This renders the page controls AND the count, because the count is the
//      part that makes truncation visible: "۱۰٬۶۸۳ مورد" next to "صفحه ۱ از
//      ۲۱۴" is a claim the page can keep, where a bare list is not.
//
//      Links, not buttons — a paginated admin list should survive a refresh
//      and be shareable, so the page number lives in the URL.
// Env / Identity: Pure presentational Server Component. No IO.
// ============================================================================
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const fa = (n: number) => n.toLocaleString("fa-IR");

export const ADMIN_PAGE_SIZE = 50;

/** Page numbers to show: first, last, and a window around the current one. */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = new Set<number>([1, total, current]);
  for (const d of [-2, -1, 1, 2]) {
    const p = current + d;
    if (p > 1 && p < total) out.add(p);
  }
  const sorted = [...out].sort((a, b) => a - b);
  const withGaps: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) withGaps.push("…");
    withGaps.push(p);
    prev = p;
  }
  return withGaps;
}

export function AdminPagination({
  page,
  pageSize = ADMIN_PAGE_SIZE,
  total,
  basePath,
  params = {},
  itemLabel = "مورد",
}: {
  page: number;
  pageSize?: number;
  total: number;
  basePath: string;
  /** The other query params to carry across pages (search, status filter…). */
  params?: Record<string, string | undefined>;
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[color:var(--muted-text)]">
        {total === 0 ? (
          <>هیچ {itemLabel}ی یافت نشد</>
        ) : (
          <>
            نمایش <span className="font-bold text-[color:var(--text)]">{fa(from)}</span>
            {" تا "}
            <span className="font-bold text-[color:var(--text)]">{fa(to)}</span>
            {" از "}
            <span className="font-bold text-[color:var(--text)]">{fa(total)}</span> {itemLabel}
          </>
        )}
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-1" aria-label="صفحه‌بندی">
          {/* RTL: «قبلی» points right. */}
          <PageLink href={href(page - 1)} disabled={page <= 1} label="صفحه‌ی قبل">
            <ChevronRight className="h-4 w-4" />
          </PageLink>

          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-[color:var(--muted-text)]">…</span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={`min-w-8 rounded-lg px-2 py-1.5 text-center text-xs font-bold transition ${
                  p === page
                    ? "bg-[color:var(--lajvard)] text-white"
                    : "border border-[color:var(--line)] bg-white text-[color:var(--text)] hover:bg-gray-50"
                }`}
              >
                {fa(p)}
              </Link>
            )
          )}

          <PageLink href={href(page + 1)} disabled={page >= totalPages} label="صفحه‌ی بعد">
            <ChevronLeft className="h-4 w-4" />
          </PageLink>
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-gray-50 text-gray-300"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white text-[color:var(--text)] transition hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}

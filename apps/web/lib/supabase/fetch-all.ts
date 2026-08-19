// ============================================================================
// Source: apps/web/lib/supabase/fetch-all.ts
// Version: 1.0.0 — 2026-08-18
// Why: PostgREST caps an unbounded select at 1,000 rows and returns NO error —
//      the query simply succeeds with a slice. Every "count all public
//      listings" path in this codebase was quietly seeing 1,000 of 5,120:
//      the sitemap submitted 20% of the directory to Google, llms-full.txt
//      exported 20% while calling itself a full export, /provinces displayed
//      998, and countCategoryCities dropped city×category pages below the
//      indexability bar because most of their rows were never fetched.
// Env / Identity: Server-side. Inherits whatever client is passed, so RLS
//      still decides what is visible.
// ============================================================================
/**
 * Minimal shape of what a Supabase query builder gives us: something that can
 * be narrowed with .range() and awaited. Typed structurally rather than
 * against PostgrestFilterBuilder's five generics, which differ between the
 * supabase-js versions the web and mobile apps pin.
 */
type RangeQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
};

/** PostgREST's own default. Keep pages at or below it. */
const PAGE = 1000;

/**
 * Drain a query page by page until it stops returning full pages.
 *
 * Pass a *factory*, not a query: a PostgrestFilterBuilder is a thenable and
 * can only be awaited once, so each page needs a fresh one.
 *
 *   const rows = await fetchAllRows(() =>
 *     supabase.from("businesses").select("slug").in("status", PUBLIC_STATUSES)
 *   );
 *
 * `cap` is a safety valve, not a target — it stops a runaway loop if the table
 * grows unexpectedly. Raise it deliberately when the directory outgrows it.
 */
export async function fetchAllRows<T>(
  makeQuery: () => RangeQuery<T>,
  { cap = 50_000 }: { cap?: number } = {}
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; from < cap; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) throw error;

    const rows = (data ?? []) as T[];
    all.push(...rows);

    // A short page means we reached the end. An exactly-full page is
    // ambiguous, so we ask for one more and let it come back empty.
    if (rows.length < PAGE) break;
  }

  return all;
}

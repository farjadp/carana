// ============================================================================
// Source: app/loading.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Route-level loading state so navigation does not look frozen.
// ============================================================================
export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-dot" />
      <span className="route-loading-dot" />
      <span className="route-loading-dot" />
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}

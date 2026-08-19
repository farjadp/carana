// ============================================================================
// Source: apps/web/components/brand-mark.tsx
// Version: 2.0.0 — 2026-08-18 (rebrand: GOPLAZA G-mark)
// Why: The GOPLAZA symbol, inlined so it inherits colour and needs no network
//      request. Geometry is shared with scripts/generate-brand-assets.mjs and
//      apps/mobile/src/components/brand-mark.tsx — change all three together.
// Env / Identity: Presentational.
// ============================================================================
// PROVISIONAL GEOMETRY: rebuilt as clean paths from the raster brand board of
// 2026-08-18. Replace with the master SVG paths when the vector kit arrives.

/**
 * The mark reads as a G whose crossbar becomes a path and whose stem squares
 * off into a place: go, path, plaza. It stays legible down to 16px, so the
 * `simple` flag (kept for call-site compatibility) draws the same geometry.
 */
export function BrandMark({
  size = 32,
  color = "currentColor",
  simple = false,
  title = "GOPLAZA",
}: {
  size?: number;
  color?: string;
  simple?: boolean;
  title?: string;
}) {
  void simple;
  return (
    <svg
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      fill={color}
    >
      <path d="M 813 176 A 450 450 0 1 0 711 897 L 627 738 A 270 270 0 1 1 643 271 Z" />
      <path d="M 470 410 H 920 V 900 H 836 L 730 774 V 590 H 470 Z" />
    </svg>
  );
}

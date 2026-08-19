// ============================================================================
// Source: apps/web/app/opengraph-image.tsx
// Version: 1.0.0 — 2026-08-18
// Why: The site had no OpenGraph image at all, so every share of the homepage,
//      a listing or a job ad rendered as a bare text card. Generated rather
//      than shipped as a PNG so the mark, palette and wordmark stay in step
//      with the brand tokens.
//      Next uses this as the default og:image for every route that does not
//      declare its own, and the file name is the whole API.
// Env / Identity: Public, static at build time.
// ============================================================================
import { ImageResponse } from "next/og";

import { brand } from "@goplaza/core";

export const alt = "GOPLAZA — دایرکتوری کسب‌وکارهای ایرانیان کانادا";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The mark geometry, shared with components/brand-mark.tsx.
const ARC = "M 813 176 A 450 450 0 1 0 711 897 L 627 738 A 270 270 0 1 1 643 271 Z";
const HOOK = "M 470 410 H 920 V 900 H 836 L 730 774 V 590 H 470 Z";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: brand.colors.cream,
          padding: 84,
          position: "relative",
        }}
      >
        {/* Oversized mark, bled off the right edge as a watermark. */}
        <div style={{ position: "absolute", right: -120, top: -80, display: "flex", opacity: 0.07 }}>
          <svg width={780} height={780} viewBox="0 0 1000 1000">
            <path d={ARC} fill={brand.colors.burgundy} />
            <path d={HOOK} fill={brand.colors.burgundy} />
          </svg>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width={104} height={104} viewBox="0 0 1000 1000">
            <path d={ARC} fill={brand.colors.burgundy} />
            <path d={HOOK} fill={brand.colors.burgundy} />
          </svg>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, letterSpacing: 6 }}>
            <span style={{ color: brand.colors.burgundy }}>GO</span>
            <span style={{ color: brand.colors.navy }}>PLAZA</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontSize: 42,
            color: brand.colors.navy,
            fontWeight: 600,
          }}
        >
          {brand.tagline.en}
        </div>

        <div style={{ display: "flex", marginTop: 18, fontSize: 30, color: "#5f6472" }}>
          {brand.concept.en}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 44 }}>
          <div style={{ display: "flex", width: 120, height: 5, background: brand.colors.gold }} />
          <div style={{ display: "flex", fontSize: 28, color: brand.colors.navy, letterSpacing: 2 }}>
            {brand.domain}
          </div>
        </div>
      </div>
    ),
    size
  );
}

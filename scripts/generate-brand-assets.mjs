// ============================================================================
// Source: scripts/generate-brand-assets.mjs
// Version: 1.0.0 — 2026-08-18
// Why: One script that turns the GOPLAZA mark geometry into every raster the
//      web app and the Expo app need (favicons, touch icons, adaptive icons,
//      splash), so a new master SVG means "edit MARK below, run once".
//      Run from apps/web so `sharp` resolves:  node ../../scripts/generate-brand-assets.mjs
// Env / Identity: Local tooling only.
// ============================================================================
// PROVISIONAL GEOMETRY. Rebuilt as clean paths from the raster brand board
// supplied on 2026-08-18; no vector master exists in the repo yet. When the
// master SVG arrives, paste its paths here AND in
//   apps/web/components/brand-mark.tsx
//   apps/mobile/src/components/brand-mark.tsx
// then run this script.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_PUBLIC = path.join(ROOT, "apps/web/public");
const BRAND = path.join(WEB_PUBLIC, "brand");
const MOBILE = path.join(ROOT, "apps/mobile/assets/images");

const BURGUNDY = "#7A1831";
const NAVY = "#14213D";
const CREAM = "#F6F1E8";
const GOLD = "#C9A24B";

// viewBox 0 0 1000 1000
const ARC = "M 813 176 A 450 450 0 1 0 711 897 L 627 738 A 270 270 0 1 1 643 271 Z";
const HOOK = "M 470 410 H 920 V 900 H 836 L 730 774 V 590 H 470 Z";
const markPaths = (fill) => `<path fill="${fill}" d="${ARC}"/><path fill="${fill}" d="${HOOK}"/>`;

const symbolSvg = (fill, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" role="img" aria-labelledby="t">
  <title id="t">${title}</title>
  ${markPaths(fill)}
</svg>
`;

/** Mark centred in a square tile with padding, on a solid or transparent ground. */
const tileSvg = (size, { bg, fill, pad = 0.18, radius = 0 }) => {
  const s = size * (1 - pad * 2);
  const o = size * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : ""}
  <g transform="translate(${o} ${o}) scale(${s / 1000})">${markPaths(fill)}</g>
</svg>`;
};

const lockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2600 700" role="img" aria-labelledby="t">
  <title id="t">GOPLAZA — Discover. Connect. Grow.</title>
  <g transform="translate(60 50) scale(0.6)">${markPaths(BURGUNDY)}</g>
  <text x="760" y="440" font-family="Montserrat, 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="330" letter-spacing="30">
    <tspan fill="${BURGUNDY}">GO</tspan><tspan fill="${NAVY}">PLAZA</tspan>
  </text>
  <line x1="780" y1="560" x2="1120" y2="560" stroke="${GOLD}" stroke-width="6"/>
  <text x="1170" y="580" font-family="Montserrat, 'Helvetica Neue', Arial, sans-serif" font-weight="500" font-size="72" fill="${NAVY}" letter-spacing="2">Discover. Connect. Grow.</text>
  <line x1="2160" y1="560" x2="2500" y2="560" stroke="${GOLD}" stroke-width="6"/>
</svg>
`;

/** Minimal ICO container around one PNG (Windows/Chrome accept PNG-in-ICO). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const dir = Buffer.alloc(16);
  dir.writeUInt8(size === 256 ? 0 : size, 0); dir.writeUInt8(size === 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2); dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8); dir.writeUInt32LE(22, 12);
  return Buffer.concat([header, dir, png]);
}

const png = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(file).then(() => console.log("  ", path.relative(ROOT, file)));

fs.mkdirSync(BRAND, { recursive: true });

// --- Vector brand pack -------------------------------------------------------
fs.writeFileSync(path.join(BRAND, "goplaza-symbol.svg"), symbolSvg(BURGUNDY, "GOPLAZA symbol — burgundy"));
fs.writeFileSync(path.join(BRAND, "goplaza-symbol-white.svg"), symbolSvg("#FFFFFF", "GOPLAZA symbol — white"));
fs.writeFileSync(path.join(BRAND, "goplaza-symbol-black.svg"), symbolSvg("#000000", "GOPLAZA symbol — black"));
fs.writeFileSync(path.join(BRAND, "goplaza-logo-horizontal.svg"), lockupSvg);
fs.writeFileSync(path.join(BRAND, "goplaza-app-icon.svg"), tileSvg(1000, { bg: BURGUNDY, fill: CREAM, radius: 220 }));
fs.writeFileSync(path.join(BRAND, "goplaza-favicon.svg"), tileSvg(1000, { bg: BURGUNDY, fill: CREAM, pad: 0.12, radius: 200 }));
fs.writeFileSync(path.join(WEB_PUBLIC, "safari-pinned-tab.svg"), symbolSvg("#000000", "GOPLAZA"));
console.log("vectors written");

// --- Web rasters -------------------------------------------------------------
const favTile = tileSvg(1000, { bg: BURGUNDY, fill: CREAM, pad: 0.12, radius: 200 });
const touchTile = tileSvg(1000, { bg: BURGUNDY, fill: CREAM, pad: 0.16 }); // iOS rounds it
await png(favTile, 16, path.join(WEB_PUBLIC, "favicon-16x16.png"));
await png(favTile, 32, path.join(WEB_PUBLIC, "favicon-32x32.png"));
await png(touchTile, 180, path.join(WEB_PUBLIC, "apple-touch-icon.png"));
await png(touchTile, 192, path.join(WEB_PUBLIC, "android-chrome-192x192.png"));
await png(touchTile, 512, path.join(WEB_PUBLIC, "android-chrome-512x512.png"));
{
  const buf = await sharp(Buffer.from(favTile)).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(WEB_PUBLIC, "favicon.ico"), pngToIco(buf, 32));
  console.log("   apps/web/public/favicon.ico");
}

// --- Mobile rasters ----------------------------------------------------------
await png(tileSvg(1000, { bg: BURGUNDY, fill: CREAM, pad: 0.16 }), 1024, path.join(MOBILE, "icon.png"));
await png(tileSvg(1000, { bg: BURGUNDY, fill: CREAM, pad: 0.16 }), 64, path.join(MOBILE, "favicon.png"));
// Splash: mark alone on transparent; app.json paints the cream ground.
await png(tileSvg(1000, { bg: null, fill: BURGUNDY, pad: 0.1 }), 512, path.join(MOBILE, "splash-icon.png"));
// Android adaptive: foreground inside the 66% safe zone, background solid.
await png(tileSvg(1000, { bg: null, fill: CREAM, pad: 0.27 }), 1024, path.join(MOBILE, "android-icon-foreground.png"));
await png(tileSvg(1000, { bg: BURGUNDY, fill: BURGUNDY, pad: 0.5 }), 1024, path.join(MOBILE, "android-icon-background.png"));
await png(tileSvg(1000, { bg: null, fill: "#FFFFFF", pad: 0.27 }), 1024, path.join(MOBILE, "android-icon-monochrome.png"));
console.log("done");

// ============================================================================
// Source: app/layout.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Define the global App Router shell, fonts, metadata, and RTL document.
// Env / Identity: Brand identity for čārana, no secrets used here.
// ============================================================================
import type { Metadata, Viewport } from "next";
import { Manrope, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

// Latin UI face from the brand book. Vazirmatn carries Persian; pairing them
// keeps the two scripts from reading as two separate brands.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "čārana | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
    template: "%s | čārana",
  },
  description:
    "čārana دایرکتوری فارسی‌زبان برای معرفی کسب‌وکارهای ایرانیان کاناداست؛ از خدمات محلی تا برندهای حرفه‌ای.",
  // Assets come from the designer's favicon pack in public/. Declared here
  // rather than as raw <link> tags so Next owns deduplication and ordering.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#800000" }],
  },
  manifest: "/manifest.webmanifest",
};

/**
 * themeColor belongs to the Viewport export, not Metadata — putting it on
 * Metadata is silently ignored.
 */
export const viewport: Viewport = {
  themeColor: "#800000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} ${manrope.variable}`}>
        {children}
        {/* Cookieless by design. It stores nothing on the visitor's device, so
            it needs no consent banner — which matters here, because a cookie
            wall would be the first thing a visitor meets on a directory whose
            whole proposition is trust, and a meaningful share would decline
            and skew the numbers anyway. */}
        <Analytics />
      </body>
    </html>
  );
}

// ============================================================================
// Source: app/layout.tsx
// Version: 1.3.0 — 2026-08-18
// Why: Define the global App Router shell, fonts, metadata, and RTL document.
//      v1.3 adds metadataBase, site-wide OpenGraph/Twitter defaults and the
//      Organization + WebSite entity graph. Without metadataBase Next emitted
//      RELATIVE canonicals (`<link rel="canonical" href="/jobs">`), which
//      resolve against whatever host served the page — so pages served from
//      charana.ca declared themselves canonical instead of pointing at
//      goplaza.ca, defeating the whole point of the rebrand redirect.
// Env / Identity: Brand identity for GOPLAZA, no secrets used here.
// ============================================================================
import type { Metadata, Viewport } from "next";
import { Manrope, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { brand } from "@goplaza/core";

import { JsonLd } from "@/components/json-ld";
import { company } from "@/lib/data/company";
import { env } from "@/lib/env";
import { organizationLd, webSiteLd } from "@/lib/seo/entity";

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

const DESCRIPTION =
  "گوپلازا دایرکتوری فارسی‌زبان برای معرفی کسب‌وکارهای ایرانیان کاناداست؛ از خدمات محلی تا برندهای حرفه‌ای.";

export const metadata: Metadata = {
  /**
   * Every relative URL in any page's metadata resolves against this. It must
   * be the canonical origin, never the deployment host, or a page served from
   * an alias domain self-canonicalises to that alias.
   */
  metadataBase: new URL(env.baseUrl),
  title: {
    default: "GOPLAZA | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
    template: "%s | GOPLAZA",
  },
  description: DESCRIPTION,
  applicationName: brand.name,
  /**
   * Deliberately NO `alternates.canonical` here. Metadata is inherited, so a
   * canonical on the layout makes every page that does not set its own
   * declare the homepage canonical — which asks Google to drop them. Same for
   * openGraph.url. Each page owns its own; the homepage sets it in page.tsx.
   */
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: "fa_CA",
    title: "GOPLAZA | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "GOPLAZA | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
    description: DESCRIPTION,
  },
  // Assets come from the designer's favicon pack in public/. Declared here
  // rather than as raw <link> tags so Next owns deduplication and ordering.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#7A1831" }],
  },
  manifest: "/manifest.webmanifest",
};

/**
 * themeColor belongs to the Viewport export, not Metadata — putting it on
 * Metadata is silently ignored.
 */
export const viewport: Viewport = {
  themeColor: "#7A1831",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} ${manrope.variable}`}>
        {/* Entity graph, emitted once for the whole site. organizationLd
            carries alternateName "čārana" so the rename is machine-readable
            rather than something a crawler has to infer from the redirect. */}
        <JsonLd data={organizationLd()} />
        <JsonLd data={webSiteLd()} />
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

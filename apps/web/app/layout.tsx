// ============================================================================
// Source: app/layout.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Define the global App Router shell, fonts, metadata, and RTL document.
// Env / Identity: Brand identity for čārana, no secrets used here.
// ============================================================================
import type { Metadata } from "next";
import { Cormorant_Garamond, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "čārana | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
  description:
    "čārana دایرکتوری فارسی‌زبان برای معرفی کسب‌وکارهای ایرانیان کاناداست؛ از خدمات محلی تا برندهای حرفه‌ای.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazirmatn.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}

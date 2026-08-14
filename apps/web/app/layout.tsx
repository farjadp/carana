// ============================================================================
// Source: app/layout.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Define the global App Router shell, fonts, metadata, and RTL document.
// Env / Identity: Brand identity for čārana, no secrets used here.
// ============================================================================
import type { Metadata } from "next";
import { Manrope, Vazirmatn } from "next/font/google";
import type { ReactNode } from "react";

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
  icons: {
    icon: "/brand/charana-mark-primary.svg",
    apple: "/brand/charana-app-icon.svg",
  },
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
      </body>
    </html>
  );
}

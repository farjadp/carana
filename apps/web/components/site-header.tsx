// ============================================================================
// Source: components/site-header.tsx
// Version: 2.0.0 — 2026-08-23
// Why: Shared navigation. Server half: reads the session and renders the shell;
//      the menu itself lives in header-nav.tsx because it needs state.
// Env / Identity: Reads the current authenticated user on the server.
// ============================================================================
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Search } from "lucide-react";
import { HeaderNav } from "@/components/header-nav";
import { getOptionalUser } from "@/lib/auth/session";
import type { NavSection } from "@/lib/site-content";

type SiteHeaderProps = {
  currentSection: NavSection;
  currentPath: string;
};

export async function SiteHeader({ currentPath }: SiteHeaderProps) {
  const user = await getOptionalUser();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="čārana، صفحه اصلی">
          <BrandMark size={34} color="var(--annabi)" />
          <strong className="brand-name">čārana</strong>
        </Link>

        <HeaderNav currentPath={currentPath} isSignedIn={!!user} />

        <div className="header-actions">
          <form action="/search" method="get" className="header-search" role="search">
            <Search size={15} aria-hidden />
            <input name="q" placeholder="جستجو…" aria-label="جستجو در چارانا" />
          </form>
          {user ? (
            <Link href="/profile" className="header-link">
              پروفایل
            </Link>
          ) : (
            <Link href="/auth/login" className="header-link">
              ورود
            </Link>
          )}

          {/* One primary action. Business owners are the paying side, so this
              stays prominent, but it is the only filled control in the bar. */}
          <Link href="/dashboard/business/new" className="header-cta">
            ثبت کسب‌وکار
          </Link>
        </div>
      </div>
    </header>
  );
}

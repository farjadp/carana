// ============================================================================
// Source: components/site-header.tsx
// Version: 2.0.0 — 2026-08-23
// Why: Shared navigation. Server half: reads the session and renders the shell;
//      the menu itself lives in header-nav.tsx because it needs state.
// Env / Identity: Reads the current authenticated user on the server.
// ============================================================================
import Link from "next/link";

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
          <span className="brand-mark" aria-hidden="true">
            č
          </span>
          <strong className="brand-name">čārana</strong>
        </Link>

        <HeaderNav currentPath={currentPath} isSignedIn={!!user} />

        <div className="header-actions">
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

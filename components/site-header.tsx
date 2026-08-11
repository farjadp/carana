// ============================================================================
// Source: components/site-header.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Render the shared navigation, grouped menus, and auth CTAs.
// Env / Identity: Shared navigation shell for čārana.
// ============================================================================
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { NavSection } from "@/lib/site-content";

type SiteHeaderProps = {
  currentSection: NavSection;
  currentPath: string;
};

function NavMenuLink({
  href,
  label,
  currentPath,
}: {
  href: string;
  label: string;
  currentPath: string;
}) {
  return (
    <Link href={href} aria-current={currentPath === href ? "page" : undefined}>
      {label}
    </Link>
  );
}

export function SiteHeader({ currentSection, currentPath }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Charana home">
        <span className="brand-mark">č</span>
        <div className="brand-copy">
          <strong>čārana</strong>
          <span>دایرکتوری کسب‌وکارهای ایرانیان کانادا</span>
        </div>
      </Link>

      <nav className="main-nav" aria-label="ناوبری اصلی">
        <Link href="/" aria-current={currentPath === "/" ? "page" : undefined}>
          خانه
        </Link>

        <div className="nav-group">
          <button
            className="nav-trigger"
            type="button"
            data-current={currentSection === "business"}
          >
            کسب‌وکارها
            <span className="nav-caret">⌄</span>
          </button>
          <div className="nav-menu">
            <NavMenuLink href="/categories" label="دسته‌بندی‌ها" currentPath={currentPath} />
            <NavMenuLink
              href="/how-it-works"
              label="چطور کار می‌کند"
              currentPath={currentPath}
            />
            <NavMenuLink href="/trust" label="اعتماد و امنیت" currentPath={currentPath} />
            <NavMenuLink
              href="/architecture"
              label="معماری کاربری"
              currentPath={currentPath}
            />
          </div>
        </div>

        <div className="nav-group">
          <button
            className="nav-trigger"
            type="button"
            data-current={currentSection === "brand"}
          >
            برند
            <span className="nav-caret">⌄</span>
          </button>
          <div className="nav-menu">
            <NavMenuLink href="/story" label="داستان اسم" currentPath={currentPath} />
            <NavMenuLink href="/about" label="درباره ما" currentPath={currentPath} />
            <NavMenuLink href="/contact" label="ارتباط با ما" currentPath={currentPath} />
          </div>
        </div>
      </nav>

      <div className="header-actions">
        <Link className="text-link" href="/auth/login">
          ورود
        </Link>
        <Button asChild variant="solid">
          <Link href="/auth/signup">ثبت‌نام کسب‌وکار</Link>
        </Button>
      </div>
    </header>
  );
}

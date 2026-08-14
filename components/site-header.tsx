// ============================================================================
// Source: components/site-header.tsx
// Version: 1.4.0 — 2026-08-11
// Why: Render the shared navigation, grouped menus, and session-aware auth CTAs.
// Env / Identity: Reads the current authenticated user on the server.
// ============================================================================
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getOptionalUser } from "@/lib/auth/session";
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

export async function SiteHeader({ currentSection, currentPath }: SiteHeaderProps) {
  const user = await getOptionalUser();

  return (
    <header className="site-header border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-2 hover:opacity-90" href="/" aria-label="Charana home">
            <span className="bg-[color:var(--lajvard)] text-white font-bold w-8 h-8 rounded flex items-center justify-center text-lg">č</span>
            <div className="hidden sm:flex flex-col">
              <strong className="text-lg font-black leading-none text-gray-900 tracking-tight">čārana</strong>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600" aria-label="ناوبری اصلی">
            <Link href="/" className="hover:text-[color:var(--lajvard)] transition-colors">خانه</Link>
            <Link href="/categories" className="hover:text-[color:var(--lajvard)] transition-colors">دسته‌بندی‌ها</Link>
            <Link href="/cities" className="hover:text-[color:var(--lajvard)] transition-colors">شهرها</Link>
            <Link href="/businesses" className="hover:text-[color:var(--lajvard)] transition-colors">کسب‌وکارها</Link>
            <Link href="/about" className="hover:text-[color:var(--lajvard)] transition-colors">درباره ما</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link className="text-sm font-medium hover:text-[color:var(--lajvard)]" href="/profile">
                پروفایل
              </Link>
              <form action="/auth/logout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  خروج
                </Button>
              </form>
            </>
          ) : (
            <Link className="text-sm font-medium hover:text-[color:var(--lajvard)] hidden sm:block" href="/auth/login">
              ورود
            </Link>
          )}
          <Button asChild className="bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white">
            <Link href="/dashboard/business/new">ثبت کسب‌وکار</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

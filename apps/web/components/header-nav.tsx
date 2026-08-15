// ============================================================================
// Source: components/header-nav.tsx
// Version: 1.0.0 — 2026-08-23
// Why: Interactive half of the site header.
//
// The previous header hid the whole nav below `md` and offered no replacement,
// so on a phone — where most of this directory's traffic lands — there was no
// way to reach categories, cities or anything else. This adds the menu, marks
// the active section, and keeps one clear primary action.
// Env / Identity: Client component. Receives the session state as a prop; it
//      never reads auth itself.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

export type NavItem = { href: string; label: string };

// Primary navigation is for finding a business, and nothing else. "About us"
// used to sit here; nobody arrives at a directory wanting to read about the
// directory, so it moved to the secondary menu with the rest of the company
// pages. Long labels were shortened — the bar has to survive a narrow laptop.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "خانه" },
  { href: "/categories", label: "دسته‌بندی‌ها" },
  { href: "/cities", label: "شهرها" },
  { href: "/businesses", label: "همه کسب‌وکارها" },
];

/** The "About" group — one item in the bar, five underneath. */
export const ABOUT_ITEMS: NavItem[] = [
  { href: "/about", label: "درباره محصول" },
  { href: "/team", label: "معرفی تیم" },
  { href: "/roadmap", label: "رودمپ" },
  { href: "/releases", label: "نسخه‌ها" },
  { href: "/download", label: "دانلود" },
];

const SECONDARY: NavItem[] = [
  { href: "/provinces", label: "استان‌ها" },
  { href: "/how-it-works", label: "چطور کار می‌کند" },
  { href: "/trust", label: "اعتماد و بررسی" },
  { href: "/support", label: "پشتیبانی" },
  { href: "/contact", label: "تماس با ما" },
];

/** `/` only matches itself; everything else matches its subtree. */
function isActive(href: string, currentPath: string) {
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function HeaderNav({
  currentPath,
  isSignedIn,
}: {
  currentPath: string;
  isSignedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Close on route change, and stop the page scrolling behind the panel.
  useEffect(() => setOpen(false), [currentPath]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="header-nav" aria-label="ناوبری اصلی">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`header-nav-link${isActive(item.href, currentPath) ? " is-active" : ""}`}
            aria-current={isActive(item.href, currentPath) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div className="header-nav-group">
          <button
            type="button"
            className={`header-nav-link header-nav-group-trigger${ABOUT_ITEMS.some((i) => isActive(i.href, currentPath)) ? " is-active" : ""}`}
            aria-haspopup="menu"
          >
            درباره ما <ChevronDown size={14} />
          </button>
          <div className="header-nav-menu" role="menu">
            {ABOUT_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" className={`header-nav-menu-link${isActive(item.href, currentPath) ? " is-active" : ""}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <button
        type="button"
        className="header-burger"
        aria-label={open ? "بستن منو" : "باز کردن منو"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open ? (
        <div className="mobile-menu-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      ) : null}

      <div id="mobile-menu" className={`mobile-menu${open ? " is-open" : ""}`} hidden={!open}>
        <nav aria-label="ناوبری موبایل">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-menu-link${isActive(item.href, currentPath) ? " is-active" : ""}`}
              aria-current={isActive(item.href, currentPath) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}

          <div className="mobile-menu-divider" />
          <div className="mobile-menu-group-label">درباره ما</div>
          {ABOUT_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={`mobile-menu-link is-secondary${isActive(item.href, currentPath) ? " is-active" : ""}`}>
              {item.label}
            </Link>
          ))}

          <div className="mobile-menu-divider" />

          {SECONDARY.map((item) => (
            <Link key={item.href} href={item.href} className="mobile-menu-link is-secondary">
              {item.label}
            </Link>
          ))}

          <div className="mobile-menu-divider" />

          {isSignedIn ? (
            <>
              <Link href="/profile" className="mobile-menu-link">
                پروفایل من
              </Link>
              <Link href="/dashboard/business" className="mobile-menu-link">
                کسب‌وکار من
              </Link>
              <form action="/auth/logout" method="post">
                <button type="submit" className="mobile-menu-link is-plain">
                  خروج از حساب
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/login" className="mobile-menu-link">
              ورود یا ثبت‌نام
            </Link>
          )}

          <Link href="/dashboard/business/new" className="mobile-menu-cta">
            ثبت کسب‌وکار
          </Link>
        </nav>
      </div>
    </>
  );
}

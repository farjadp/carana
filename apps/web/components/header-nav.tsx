// ============================================================================
// Source: components/header-nav.tsx
// Version: 2.1.0 — 2026-08-24
// Why: Interactive half of the site header.
//
// v2 fixes the dropdown and takes over the footer's job. The "About" menu was
// hover-only and sat 10px below its trigger, so the pointer crossed dead space
// on the way down and the menu vanished before it could be clicked — and on a
// touch screen it could not be opened at all. Menus are now state-driven
// (click, hover, keyboard), the gap is a transparent bridge inside the panel
// rather than empty page, and closing is delayed just long enough to survive a
// diagonal mouse path. The footer was carrying eleven links; everything that
// is navigation moved up here into two grouped menus.
// Env / Identity: Client component. Receives the session state as a prop; it
//      never reads auth itself.
// ============================================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

export type NavItem = { href: string; label: string };

/** A bar item that also carries a menu. `href` makes the trigger clickable. */
export type NavGroup = { id: string; label: string; href?: string; items: NavItem[] };

// Primary navigation is for finding a business, and nothing else. "About us"
// used to sit here; nobody arrives at a directory wanting to read about the
// directory, so it moved to a menu with the rest of the company pages.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "خانه" },
  { href: "/categories", label: "دسته‌بندی‌ها" },
  { href: "/businesses", label: "همه کسب‌وکارها" },
  // The jobs board is the one thing here that is not a way of finding a
  // business, and it sits in the bar anyway: it is the reason to come back
  // weekly, and a directory nobody returns to is a phone book. Buried in a
  // menu it would not be that.
  { href: "/jobs", label: "استخدام" },
  // Articles sit in the bar rather than in the راهنما menu, where the single
  // "وبلاگ" link was the least-clicked thing on the site. It is the other
  // reason to come back between two searches, so it belongs next to the jobs
  // board. The menu keeps its item count: this one moved, it was not added.
  { href: "/blog", label: "مقالات" },
];

/** Grouped menus. Everything the footer used to list lives in one of these. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "places",
    label: "شهرها",
    href: "/cities",
    items: [
      { href: "/cities", label: "همه شهرها" },
      { href: "/provinces", label: "استان‌ها" },
    ],
  },
  {
    id: "help",
    label: "راهنما",
    items: [
      { href: "/features", label: "امکانات" },
      { href: "/pricing", label: "تعرفه‌ها" },
      { href: "/how-it-works", label: "چطور کار می‌کند" },
      { href: "/trust", label: "اعتماد و بررسی" },
      { href: "/support", label: "پشتیبانی" },
      { href: "/contact", label: "تماس با ما" },
    ],
  },
  {
    id: "about",
    label: "درباره ما",
    items: [
      { href: "/about", label: "درباره محصول" },
      { href: "/story", label: "داستان برند" },
      { href: "/team", label: "معرفی تیم" },
      { href: "/roadmap", label: "رودمپ" },
      { href: "/releases", label: "نسخه‌ها" },
      { href: "/download", label: "دانلود اپ" },
    ],
  },
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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover-out closes on a short delay. Without it, the diagonal path from the
  // trigger to the far edge of the panel leaves the group for a few frames and
  // the menu closes under the pointer.
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenGroup(null), 160);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Close everything on route change. Adjusting state during render is the
  // documented pattern for "reset when a prop changes"; doing it in an effect
  // renders the stale menu once first, and trips react-hooks/set-state-in-effect.
  const [lastPath, setLastPath] = useState(currentPath);
  if (lastPath !== currentPath) {
    setLastPath(currentPath);
    setOpen(false);
    setOpenGroup(null);
  }

  // Stop the page scrolling behind the mobile panel.

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setOpenGroup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A tap outside closes an open menu — the touch equivalent of hovering away.
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current?.contains(e.target as Node)) return;
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openGroup]);

  const groupActive = (group: NavGroup) =>
    group.items.some((i) => isActive(i.href, currentPath)) ||
    (!!group.href && isActive(group.href, currentPath));

  return (
    <>
      <nav className="header-nav" aria-label="ناوبری اصلی" ref={navRef}>
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

        {NAV_GROUPS.map((group) => {
          const expanded = openGroup === group.id;
          const triggerClass = `header-nav-link header-nav-group-trigger${groupActive(group) ? " is-active" : ""}`;
          return (
            <div
              key={group.id}
              className={`header-nav-group${expanded ? " is-open" : ""}`}
              onMouseEnter={() => {
                cancelClose();
                setOpenGroup(group.id);
              }}
              onMouseLeave={scheduleClose}
              onFocus={() => {
                cancelClose();
                setOpenGroup(group.id);
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenGroup(null);
              }}
            >
              {/* A group whose label is itself a destination stays clickable;
                  the chevron only opens the menu. Groups without an href use a
                  button, because a link to nowhere is a lie to a screen reader. */}
              {group.href ? (
                <span className={triggerClass}>
                  <Link href={group.href} className="header-nav-group-label">
                    {group.label}
                  </Link>
                  <button
                    type="button"
                    className="header-nav-group-toggle"
                    aria-haspopup="menu"
                    aria-expanded={expanded}
                    aria-label={`منوی ${group.label}`}
                    onClick={() => setOpenGroup(expanded ? null : group.id)}
                  >
                    <ChevronDown size={14} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={triggerClass}
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={() => setOpenGroup(expanded ? null : group.id)}
                >
                  {group.label} <ChevronDown size={14} />
                </button>
              )}

              <div className="header-nav-menu" role="menu" aria-label={group.label}>
                <div className="header-nav-menu-panel">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      tabIndex={expanded ? 0 : -1}
                      className={`header-nav-menu-link${isActive(item.href, currentPath) ? " is-active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
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

          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <div className="mobile-menu-divider" />
              <div className="mobile-menu-group-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-menu-link is-secondary${isActive(item.href, currentPath) ? " is-active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
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

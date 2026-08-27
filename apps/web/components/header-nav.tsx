// ============================================================================
// Source: components/header-nav.tsx
// Version: 3.0.0 — 2026-08-26
// Why: Interactive half of the site header.
//
// v3 rebuilds the information architecture. v2 had grown to eight top-level
// triggers — five links plus three menus — and the bar had already overflowed
// once at its own breakpoint (see docs/06-gotchas.md, the 900→960px move).
// «کانال‌ها و گروه‌ها» was one label away from doing it again, so the fix is
// not a smaller gap. It is fewer things.
//
// What changed and why each one:
//   · «خانه» is gone. The logo to its right already goes home, on every site
//     anyone has ever used, and a nav item that duplicates the logo spends a
//     slot on nothing.
//   · «دسته‌بندی‌ها», «همه کسب‌وکارها», «شهرها» and «استان‌ها» were four
//     separate triggers for one question — "show me businesses". They are one
//     menu now, «کسب‌وکارها», whose own label is the destination.
//   · «راهنما» and «درباره ما» were two menus of six flat links each. They are
//     one menu with two labelled sections: same twelve destinations, one
//     trigger, and the grouping is now visible instead of implied by which of
//     two identical-looking menus a link happened to be in.
//   · «کانال‌ها و گروه‌ها» joins «استخدام» and «مقالات» in the bar. Those three
//     are the reasons to come back between two searches; a directory nobody
//     returns to is a phone book, and none of the three would be that from
//     inside a menu.
//
// Result: five triggers instead of eight, and the two that carry the most
// destinations carry them in structure rather than in a list.
//
// One array, not two. v2 rendered NAV_ITEMS then NAV_GROUPS, which fixed every
// menu to the end of the bar — «کسب‌وکارها» could not be first without being a
// plain link. Order is now data.
// Env / Identity: Client component. Receives the session state as a prop; it
//      never reads auth itself.
// ============================================================================
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";

export type NavItem = { href: string; label: string };

/** A labelled block inside a menu panel. Used when one menu carries two ideas. */
export type NavSectionGroup = { label: string; items: NavItem[] };

/**
 * A bar item that also carries a menu.
 *
 * `href` makes the trigger itself a destination — «کسب‌وکارها» goes to
 * /businesses and the chevron opens the menu. A group without one renders a
 * button, because a link to nowhere is a lie to a screen reader.
 *
 * Exactly one of `items` or `sections` is set.
 */
export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  items?: NavItem[];
  sections?: NavSectionGroup[];
};

export type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "id" in entry;

/** Every destination a group can reach, however it is laid out. */
const groupItems = (group: NavGroup): NavItem[] =>
  group.items ?? (group.sections ?? []).flatMap((s) => s.items);

/**
 * The bar, in order.
 *
 * Five triggers. Finding a business is one of them, not four; the three that
 * bring people back are visible; everything institutional is behind the last
 * one.
 */
export const NAV: NavEntry[] = [
  {
    id: "directory",
    label: "کسب‌وکارها",
    href: "/businesses",
    items: [
      { href: "/businesses", label: "همه کسب‌وکارها" },
      { href: "/categories", label: "دسته‌بندی‌ها" },
      { href: "/cities", label: "شهرها" },
      { href: "/provinces", label: "استان‌ها" },
    ],
  },
  { href: "/channels", label: "کانال‌ها و گروه‌ها" },
  { href: "/jobs", label: "استخدام" },
  { href: "/blog", label: "مقالات" },
  {
    id: "help",
    label: "راهنما",
    sections: [
      {
        label: "استفاده از پلازا",
        items: [
          { href: "/features", label: "امکانات" },
          { href: "/pricing", label: "تعرفه‌ها" },
          { href: "/how-it-works", label: "چطور کار می‌کند" },
          { href: "/trust", label: "اعتماد و بررسی" },
          { href: "/standing", label: "اعتبار مشارکت" },
          { href: "/support", label: "پشتیبانی" },
          { href: "/contact", label: "تماس با ما" },
        ],
      },
      {
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
    groupItems(group).some((i) => isActive(i.href, currentPath)) ||
    (!!group.href && isActive(group.href, currentPath));

  const menuLink = (item: NavItem, expanded: boolean) => (
    <Link
      key={item.href}
      href={item.href}
      role="menuitem"
      tabIndex={expanded ? 0 : -1}
      className={`header-nav-menu-link${isActive(item.href, currentPath) ? " is-active" : ""}`}
    >
      {item.label}
    </Link>
  );

  return (
    <>
      <nav className="header-nav" aria-label="ناوبری اصلی" ref={navRef}>
        {NAV.map((entry) => {
          if (!isGroup(entry)) {
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`header-nav-link${isActive(entry.href, currentPath) ? " is-active" : ""}`}
                aria-current={isActive(entry.href, currentPath) ? "page" : undefined}
              >
                {entry.label}
              </Link>
            );
          }

          const group = entry;
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
                {/* Two shapes, one panel. A sectioned menu carries twelve
                    destinations without becoming a twelve-item list nobody
                    reads to the bottom of. */}
                <div className={`header-nav-menu-panel${group.sections ? " is-sectioned" : ""}`}>
                  {group.sections
                    ? group.sections.map((section) => (
                        <div key={section.label} className="header-nav-menu-section">
                          <p className="header-nav-menu-section-label">{section.label}</p>
                          {section.items.map((item) => menuLink(item, expanded))}
                        </div>
                      ))
                    : (group.items ?? []).map((item) => menuLink(item, expanded))}
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
          {/* On mobile there is no width to run out of, so a group is flattened
              into its own labelled block rather than hidden behind a second
              tap. The order is the same as the bar. */}
          {NAV.map((entry) => {
            if (!isGroup(entry)) {
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={`mobile-menu-link${isActive(entry.href, currentPath) ? " is-active" : ""}`}
                  aria-current={isActive(entry.href, currentPath) ? "page" : undefined}
                >
                  {entry.label}
                </Link>
              );
            }
            const blocks = entry.sections ?? [{ label: entry.label, items: entry.items ?? [] }];
            return (
              <div key={entry.id}>
                {blocks.map((block) => (
                  <div key={block.label}>
                    <div className="mobile-menu-divider" />
                    <div className="mobile-menu-group-label">{block.label}</div>
                    {block.items.map((item) => (
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
              </div>
            );
          })}

          <div className="mobile-menu-divider" />

          {isSignedIn ? (
            <>
              <Link href="/profile" className="mobile-menu-link">
                پروفایل من
              </Link>
              <Link href="/dashboard/business" className="mobile-menu-link">
                کسب‌وکار من
              </Link>
              {/* Reachable from the profile page too. Until 26 Aug this page
                  had one door — the screen shown immediately after submitting
                  — so a rejection reason or a lapsing entry could not be
                  found again the next day. */}
              <Link href="/dashboard/channels" className="mobile-menu-link">
                کانال‌های من
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

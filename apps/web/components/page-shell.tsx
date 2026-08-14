// ============================================================================
// Source: components/page-shell.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Compose the shared site header, page body, and footer.
// Env / Identity: Shared layout shell for all routes.
// ============================================================================
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { NavSection } from "@/lib/site-content";

type PageShellProps = {
  children: ReactNode;
  currentSection: NavSection;
  currentPath: string;
};

export async function PageShell({
  children,
  currentSection,
  currentPath,
}: PageShellProps) {
  return (
    <div className="page-shell">
      <SiteHeader currentSection={currentSection} currentPath={currentPath} />
      {children}
      <SiteFooter currentPath={currentPath} />
    </div>
  );
}

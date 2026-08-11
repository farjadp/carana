import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { NavSection } from "@/lib/site-content";

type PageShellProps = {
  children: ReactNode;
  currentSection: NavSection;
  currentPath: string;
};

export function PageShell({ children, currentSection, currentPath }: PageShellProps) {
  return (
    <div className="page-shell">
      <SiteHeader currentSection={currentSection} currentPath={currentPath} />
      {children}
      <SiteFooter currentPath={currentPath} />
    </div>
  );
}

import type { ReactNode } from "react";

import { PageShell } from "@/components/page-shell";

type InnerPageProps = {
  currentPath: string;
  currentSection: "business" | "brand";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function InnerPage({
  currentPath,
  currentSection,
  eyebrow,
  title,
  description,
  children,
}: InnerPageProps) {
  return (
    <PageShell currentPath={currentPath} currentSection={currentSection}>
      <main className="page-main">
        <section className="page-hero">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>
        {children}
      </main>
    </PageShell>
  );
}

// ============================================================================
// Source: components/inner-page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: Provide a consistent wrapper for interior marketing and legal pages.
//      v2 adds an opt-in `hero="wash"` variant: the same annabi → navy wash
//      the home page and /features open on, for the pages a visitor is being
//      *shown* something rather than reading a document. It is opt-in because
//      seventeen pages share this shell and the legal ones, /businesses and
//      /provinces should keep the quiet plain header they have.
// Env / Identity: Shared page scaffold, no secret usage.
// ============================================================================
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { PageShell } from "@/components/page-shell";

type InnerPageProps = {
  currentPath: string;
  currentSection: "business" | "brand";
  /** Rendered only by the plain header; the wash lets the h1 speak for itself. */
  eyebrow: string;
  title: string;
  description: string;
  /** "plain" (default) keeps the existing quiet header. */
  hero?: "plain" | "wash";
  /** Optional row under the wash heading — anchors, a version, a stat. */
  heroAside?: ReactNode;
  children: ReactNode;
};

export function InnerPage({
  currentPath,
  currentSection,
  eyebrow,
  title,
  description,
  hero = "plain",
  heroAside,
  children,
}: InnerPageProps) {
  if (hero === "wash") {
    return (
      <PageShell currentPath={currentPath} currentSection={currentSection}>
        {/* Full-bleed: PageShell insets its content, and a hero that stops
            short of the viewport edge reads as a card, not a header. */}
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[#5A1124]">
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,#7A1831_0%,#5A1124_38%,#14213d_100%)]" />
          <div className="pointer-events-none absolute -left-28 -top-28 select-none opacity-[0.06]" aria-hidden>
            <BrandMark size={480} color="#f6f1e8" simple />
          </div>
          <div className="pointer-events-none absolute bottom-[-46%] right-[-8%] h-[52vw] max-h-[720px] w-[52vw] max-w-[720px] rounded-full border border-white/5" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-5 pb-12 pt-14 text-center md:pb-16 md:pt-20" dir="rtl">
            <h1 className="text-balance text-[2rem] font-black leading-[1.2] tracking-tight text-[#f6f1e8] sm:text-[2.6rem] md:text-[3.1rem]">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-[#f6f1e8]/75 md:text-[15px]">
              {description}
            </p>
            {heroAside ? <div className="mt-8">{heroAside}</div> : null}
          </div>
        </div>
        <main className="page-main pt-10 md:pt-12">{children}</main>
      </PageShell>
    );
  }

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

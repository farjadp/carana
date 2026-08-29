// ============================================================================
// Source: components/blog/posts-rail.tsx
// Version: 2.0.0 — 2026-08-27
// Why: The blog's rail. Everything it used to implement now lives in
//      components/ui/rail.tsx, because the home page's business sections
//      became rails too and the RTL scrolling in there is not worth having
//      twice. This keeps the blog's own arrow wording.
// Env / Identity: Re-export shell, no data access.
// ============================================================================
import { Rail } from "@/components/ui/rail";

export function PostsRail({ children }: { children: React.ReactNode }) {
  return (
    <Rail prevLabel="مقاله‌های قبلی" nextLabel="مقاله‌های بیشتر">
      {children}
    </Rail>
  );
}

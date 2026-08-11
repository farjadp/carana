// ============================================================================
// Source: components/ui/card.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Shared branded card primitive for surfaces across the app.
// Env / Identity: Pure UI primitive, no runtime secrets.
// ============================================================================
import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-[24px] border border-white/75 bg-[color:var(--surface)] shadow-[var(--shadow)] backdrop-blur-[14px]",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-6", className)} {...props} />;
}

export { Card, CardContent };

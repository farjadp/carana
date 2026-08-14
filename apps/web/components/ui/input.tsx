// ============================================================================
// Source: components/ui/input.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Shared branded text-input primitive for auth and future forms.
// Env / Identity: Pure UI primitive, no runtime secrets.
// ============================================================================
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-14 w-full rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-[color:var(--text)] shadow-none outline-none transition focus:border-[color:var(--lajvard)] focus:ring-2 focus:ring-[color:rgba(0,71,171,0.12)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

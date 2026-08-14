// ============================================================================
// Source: components/ui/label.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Shared simple label primitive for forms.
// Env / Identity: Pure UI primitive, no runtime secrets.
// ============================================================================
import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("mb-2 block text-sm font-semibold text-[color:var(--text)]", className)}
      {...props}
    />
  );
}

export { Label };

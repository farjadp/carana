import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center rounded-full border border-transparent px-5 text-sm font-medium whitespace-nowrap transition-transform transition-colors transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        solid:
          "bg-[linear-gradient(135deg,var(--annabi),#a11111)] text-white shadow-[0_16px_28px_rgba(128,0,0,0.24)]",
        muted: "border-[color:var(--line)] bg-white/70 text-[color:var(--text)]",
        ghost: "text-[color:var(--muted-text)] hover:text-[color:var(--text)]",
      },
      size: {
        default: "px-5",
        sm: "min-h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

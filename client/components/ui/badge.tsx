import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] uppercase",
  {
    variants: {
      variant: {
        default:
          "border-[var(--chip-line)] bg-[var(--chip)] text-[var(--ink-soft)]",
        secondary:
          "border-[var(--chip-line)] bg-[var(--surface)] text-[var(--muted-text)]",
        outline: "border-[var(--chip-line)] text-[var(--muted-text)]",
        lime: "border-[var(--chip-line)] bg-[var(--chip)] text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

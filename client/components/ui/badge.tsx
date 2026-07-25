import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] uppercase",
  {
    variants: {
      variant: {
        default: "border-white/15 bg-white/5 text-zinc-300",
        secondary: "border-white/10 bg-black/40 text-zinc-500",
        outline: "border-white/20 text-zinc-400",
        lime: "border-[var(--mm-accent)]/30 bg-[var(--mm-accent)]/10 text-[var(--mm-accent)]",
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
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

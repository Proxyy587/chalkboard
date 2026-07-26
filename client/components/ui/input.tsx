import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[9px] border border-[var(--chip-line)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--muted-2)] focus:border-[var(--muted-text)] focus:ring-1 focus:ring-[color-mix(in_oklab,var(--ink)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

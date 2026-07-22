import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] tracking-wide text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#dfff00]/50 focus:ring-1 focus:ring-[#dfff00]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-none border border-white/12 bg-black px-3 py-2 text-[13px] text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-white/30 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-[10px] font-medium tracking-[0.14em] text-zinc-500 uppercase",
        className
      )}
      {...props}
    />
  );
}

export { Label };

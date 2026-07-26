import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-[11px] font-medium text-[var(--muted-text)]",
        className
      )}
      {...props}
    />
  );
}

export { Label };

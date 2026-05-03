import type { ReactNode } from "react";

import { AppShell } from "@/components/chalkboard/app-shell";
import { ChalkboardProvider } from "@/components/chalkboard/chalkboard-context";

export default function ChalkboardLayout({ children }: { children: ReactNode }) {
  return (
    <ChalkboardProvider>
      <AppShell>{children}</AppShell>
    </ChalkboardProvider>
  );
}

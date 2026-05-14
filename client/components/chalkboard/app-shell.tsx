"use client";

import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh max-h-dvh w-full overflow-hidden bg-transparent">
      <Sidebar />
      <div className="chalk-main-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

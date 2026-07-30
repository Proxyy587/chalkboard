import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ConsoleShell } from "@/components/layout/console-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Settings",
  description: "Manage manimotion API keys, storage, and billing.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleShell section="settings" gate>
      {children}
    </ConsoleShell>
  );
}

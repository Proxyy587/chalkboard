import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/chalkboard/app-shell";
import { ChalkboardProvider } from "@/components/chalkboard/chalkboard-context";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "manimotion",
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: [
      "AI lecture video",
      "prompt to video",
      "STEM animation generator",
      "create educational videos online",
    ],
  }),
  title: {
    absolute: "manimotion",
  },
};

export default function ChalkboardLayout({ children }: { children: ReactNode }) {
  return (
    <ChalkboardProvider>
      <AppShell>{children}</AppShell>
    </ChalkboardProvider>
  );
}

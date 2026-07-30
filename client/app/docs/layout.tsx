import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocsSideNav } from "@/components/docs/docs-side-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Docs",
  description:
    "manimotion docs — generate educational and explainer videos from a single prompt via a simple developer API.",
  path: "/docs",
  keywords: [
    "manimotion documentation",
    "video API docs",
    "text to video API guide",
  ],
});

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <SiteHeader section="docs" />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[240px] shrink-0 overflow-y-auto border-r border-border bg-background p-5 md:block">
          <DocsSideNav />
        </aside>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-border px-4 py-3 md:hidden">
            <DocsSideNav />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

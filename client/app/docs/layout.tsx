import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DocsSideNav } from "@/components/docs/docs-side-nav";
import { ThemeToggle } from "@/components/theme/theme-provider";
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
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Back
          </Link>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <Link href="/docs" className="mm-brand truncate text-[13px]">
            manimotion
          </Link>
          <span className="hidden text-[11px] text-[var(--muted-2)] sm:inline">
            Docs
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/docs/quickstart"
            className="hidden text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground sm:inline"
          >
            Quickstart
          </Link>
          <Link
            href="/docs/api"
            className="hidden text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground sm:inline"
          >
            API
          </Link>
          <Link
            href="/docs/contributing"
            className="hidden text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground md:inline"
          >
            Contribute
          </Link>
          <Link
            href="/settings/api-keys"
            className="hidden text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground sm:inline"
          >
            Get key
          </Link>
          <ThemeToggle />
        </nav>
      </header>

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

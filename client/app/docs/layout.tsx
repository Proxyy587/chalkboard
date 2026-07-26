import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DocsSideNav } from "@/components/docs/docs-side-nav";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-black">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Back
          </Link>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <Link
            href="/docs"
            className="mm-brand truncate text-[12px] tracking-[0.08em]"
          >
            manimotion.
          </Link>
          <span className="hidden text-[11px] font-medium tracking-[0.14em] text-neutral-600 sm:inline">
            DOCS
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/docs/quickstart"
            className="hidden text-[11px] tracking-[0.1em] text-neutral-500 hover:text-white sm:inline"
          >
            QUICKSTART
          </Link>
          <Link
            href="/docs/api"
            className="hidden text-[11px] tracking-[0.1em] text-neutral-500 hover:text-white sm:inline"
          >
            API
          </Link>
          <Link
            href="/docs/contributing"
            className="hidden text-[11px] tracking-[0.1em] text-neutral-500 hover:text-white md:inline"
          >
            CONTRIBUTE
          </Link>
          <Link
            href="/settings/api-keys"
            className="inline-flex h-8 items-center gap-1 border border-white/15 bg-transparent px-3 text-[11px] font-medium tracking-[0.08em] text-white hover:bg-white/5"
          >
            GET KEY
            <span aria-hidden>↗</span>
          </Link>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[240px] shrink-0 overflow-y-auto border-r border-white/10 bg-black p-5 md:block">
          <DocsSideNav />
        </aside>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-white/10 px-4 py-3 md:hidden">
            <DocsSideNav />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

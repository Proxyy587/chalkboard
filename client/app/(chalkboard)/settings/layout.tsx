import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AccountMenu, HistoryMenu } from "@/components/account/account-menu";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SessionGate } from "@/components/settings/session-gate";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Settings",
  description: "Manage manimotion API keys and storage integrations.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
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
          <Link href="/settings" className="mm-brand truncate text-[13px]">
            manimotion
          </Link>
          <span className="hidden text-[11px] text-[var(--muted-2)] sm:inline">
            Settings
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/docs"
            className="hidden text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground sm:inline"
          >
            Docs
          </Link>
          <HistoryMenu />
          <ThemeToggle />
          <AccountMenu />
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-border p-5 md:block">
          <p className="mb-3 px-2.5 text-[11px] font-medium text-[var(--muted-2)]">
            Console
          </p>
          <SettingsNav />
          <Link
            href="/docs/quickstart"
            className="mt-8 block rounded-[8px] px-2.5 text-[12px] text-[var(--muted-text)] transition-colors hover:text-foreground"
          >
            Quickstart →
          </Link>
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-border px-4 py-3 md:hidden">
            <SettingsNav />
          </div>
          <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
            <SessionGate>{children}</SessionGate>
          </div>
        </div>
      </div>
    </div>
  );
}

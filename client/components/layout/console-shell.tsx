import type { ReactNode } from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SessionGate } from "@/components/settings/session-gate";

type Section = "settings" | "pricing" | "docs" | "home";

/**
 * Shared console chrome: SiteHeader + Console sidebar.
 * Settings pages gate on session; pricing stays public.
 */
export function ConsoleShell({
  section,
  children,
  gate = false,
  contentClassName = "mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10",
}: {
  section: Section;
  children: ReactNode;
  gate?: boolean;
  contentClassName?: string;
}) {
  const body = gate ? <SessionGate>{children}</SessionGate> : children;

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <SiteHeader section={section} />

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
          <div className={contentClassName}>{body}</div>
        </div>
      </div>
    </div>
  );
}

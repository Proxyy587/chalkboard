import type { ReactNode } from "react";
import Link from "next/link";

import { SettingsNav } from "@/components/settings/settings-nav";
import { SessionGate } from "@/components/settings/session-gate";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="shrink-0 border-b border-white/10 bg-black lg:w-[220px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
        <div className="p-5">
          <p className="mb-1 text-[11px] font-medium tracking-[0.12em] text-neutral-600">
            CONSOLE
          </p>
          <h1 className="text-[15px] font-semibold tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
            Keys · storage · account
          </p>
          <div className="mt-6">
            <SettingsNav />
          </div>
          <Link
            href="/docs"
            className="mt-8 block px-2.5 text-[12px] text-neutral-600 transition-colors hover:text-white"
          >
            Read the docs →
          </Link>
        </div>
      </aside>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-8 md:py-10">
          <SessionGate>{children}</SessionGate>
        </div>
      </div>
    </div>
  );
}

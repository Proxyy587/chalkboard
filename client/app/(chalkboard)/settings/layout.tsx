import type { ReactNode } from "react";

import { SettingsNav } from "@/components/settings/settings-nav";
import { SessionGate } from "@/components/settings/session-gate";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header>
          <h1 className="chalk-brand text-xl font-semibold italic tracking-tight text-zinc-100">
            SETTINGS
          </h1>
          <p className="mt-1 text-[11px] text-zinc-500">
            API keys, storage, and account configuration.
          </p>
        </header>
        <SessionGate>
          <SettingsNav />
          <div className="pt-2">{children}</div>
        </SessionGate>
      </div>
    </div>
  );
}

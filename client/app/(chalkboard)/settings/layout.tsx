import type { ReactNode } from "react";

import { SettingsNav } from "@/components/settings/settings-nav";
import { SessionGate } from "@/components/settings/session-gate";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8 md:px-8">
        <header className="space-y-2 border-b border-white/10 pb-5">
          <p className="mm-label">Account</p>
          <h1 className="mm-brand text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="max-w-lg text-[12px] leading-relaxed text-zinc-500">
            Keys and storage for production API use. The home demo works without these.
          </p>
        </header>
        <SessionGate>
          <SettingsNav />
          <div className="pt-1">{children}</div>
        </SessionGate>
      </div>
    </div>
  );
}

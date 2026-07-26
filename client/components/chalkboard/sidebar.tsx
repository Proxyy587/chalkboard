"use client";

import { BookOpen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountMenu, HistoryMenu } from "@/components/account/account-menu";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const nav = [
    { href: "/", label: "New", icon: Plus, match: (p: string) => p === "/" },
    {
      href: "/docs",
      label: "Docs",
      icon: BookOpen,
      match: (p: string) => p.startsWith("/docs"),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      match: (p: string) => p.startsWith("/settings"),
    },
  ];

  return (
    <aside className="mm-sidebar flex h-full min-h-0 w-[200px] shrink-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-4">
        <Link href="/" className="block min-w-0">
          <p className="mm-brand text-[13px]">manimotion</p>
        </Link>
        <ThemeToggle />
      </div>

      <div className="shrink-0 space-y-0.5 p-2">
        {nav.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-[var(--chip)] text-foreground"
                  : "text-[var(--muted-text)] hover:bg-[var(--chip)] hover:text-foreground"
              )}
            >
              <Icon className="size-4 opacity-70" strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto shrink-0 space-y-2 border-t border-border p-3">
        {session?.user ? (
          <AccountMenu className="w-full justify-start" align="start" />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-0.5">
              <HistoryMenu />
              <span className="text-[11px] text-[var(--muted-2)]">History</span>
            </div>
            <Link
              href="/sign-in"
              className="mm-pixel-btn flex h-9 w-full items-center justify-center text-[13px]"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

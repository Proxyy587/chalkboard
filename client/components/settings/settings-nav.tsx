"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, HardDrive, KeyRound, LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
  { href: "/settings/storage", label: "Storage", icon: HardDrive },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-colors",
              active
                ? "bg-[var(--chip)] font-medium text-foreground"
                : "text-[var(--muted-text)] hover:bg-[var(--chip)] hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

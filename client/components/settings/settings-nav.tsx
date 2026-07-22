"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/storage", label: "Storage" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {links.map((link) => {
        const active =
          link.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border px-3 py-1.5 text-[10px] tracking-[0.14em] transition-colors",
              active
                ? "border-[#dfff00]/40 bg-[#dfff00]/10 text-[#dfff00]"
                : "border-transparent text-zinc-500 hover:border-white/10 hover:text-zinc-300"
            )}
          >
            {link.label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/settings", label: "Overview" },
  { href: "/settings/api-keys", label: "API keys" },
  { href: "/settings/storage", label: "Storage" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0 border border-white/10">
      {links.map((link, i) => {
        const active =
          link.href === "/settings"
            ? pathname === "/settings"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 px-3 py-2.5 text-center text-[11px] tracking-[0.08em] transition-colors",
              i > 0 && "border-l border-white/10",
              active
                ? "bg-white/[0.06] text-white"
                : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

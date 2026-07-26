"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const DOCS_NAV = [
  {
    group: "Get started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/quickstart", label: "Quickstart" },
    ],
  },
  {
    group: "API",
    items: [
      { href: "/docs/api", label: "Reference" },
      { href: "/docs/storage", label: "Storage" },
      { href: "/docs/engines", label: "Engines" },
    ],
  },
  {
    group: "Project",
    items: [{ href: "/docs/contributing", label: "Contributing" }],
  },
] as const;

export function DocsSideNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {DOCS_NAV.map((section) => (
        <div key={section.group}>
          <p className="mb-2 px-2 text-[11px] font-medium text-neutral-600">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/docs"
                  ? pathname === "/docs"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block px-2.5 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-neutral-900 font-medium text-white"
                        : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

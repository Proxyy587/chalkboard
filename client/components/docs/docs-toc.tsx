"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function DocsToc({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (!items.length) return;
    const observers: IntersectionObserver[] = [];
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActive(item.id);
        },
        { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="sticky top-8">
      <p className="mb-3 text-[11px] font-medium text-neutral-600">On this page</p>
      <ul className="relative space-y-1 border-l border-white/10 pl-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block py-1 text-[12px] transition-colors",
                active === item.id
                  ? "text-white"
                  : "text-neutral-600 hover:text-neutral-300"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

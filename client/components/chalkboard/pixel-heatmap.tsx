"use client";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { cn } from "@/lib/utils";

/** Decorative contribution-style heatmap driven by local project count. */
export function PixelHeatmap() {
  const { threadIdsSorted, threadsById } = useChalkboard();
  const cells = 84;
  const levels = threadIdsSorted.map((id) => {
    const t = threadsById[id];
    if (!t) return 0;
    if (t.videos.some((v) => v.status === "completed")) return 3;
    if (t.videos.length) return 2;
    return 1;
  });

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
      aria-hidden
    >
      {Array.from({ length: cells }).map((_, i) => {
        const level = levels[i % Math.max(levels.length, 1)] ?? 0;
        const seeded = ((i * 17) % 5 === 0 ? 1 : 0) + (levels.length ? level : 0);
        const intensity = Math.min(3, seeded);
        return (
          <div
            key={i}
            className={cn(
              "aspect-square border border-white/[0.04]",
              intensity === 0 && "bg-zinc-900",
              intensity === 1 && "bg-zinc-700",
              intensity === 2 && "bg-zinc-500",
              intensity === 3 && "bg-[var(--mm-accent)]"
            )}
          />
        );
      })}
    </div>
  );
}

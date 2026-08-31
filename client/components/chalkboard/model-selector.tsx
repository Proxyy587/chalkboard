"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  allModels,
  DURATION_OPTIONS,
  modelsForPlan,
} from "@/lib/chalkboard-api";
import { PLAN_RANK } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/billing/plans";
import { readJsonSafe } from "@/lib/http";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Map a minPlan to the human-readable upgrade label shown on locked items. */
const PLAN_LABEL: Record<PlanId, string> = {
  FREE: "Free",
  HOBBY: "Hobby",
  PRO: "Pro",
};

export function ModelSelector({
  model,
  onModelChange,
  duration,
  onDurationChange,
  className,
}: {
  model: string;
  onModelChange: (model: string) => void;
  duration?: number;
  onDurationChange?: (duration: number | undefined) => void;
  className?: string;
}) {
  const [plan, setPlan] = useState<string>("FREE");

  const available = useMemo(() => modelsForPlan(plan), [plan]);
  const all = useMemo(() => allModels(), []);

  /** True when the currently selected model is locked for this plan. */
  const isCurrentModelLocked = !available.some((m) => m.id === model);

  /** True when there are any locked models (i.e. plan < PRO). */
  const hasLockedModels = available.length < all.length;

  const durationValue = duration == null ? "auto" : String(duration);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/billing/me");
        if (!res.ok) return;
        const data = await readJsonSafe<{ plan?: string }>(res);
        if (data.plan) setPlan(data.plan);
      } catch {
        /* guests stay FREE */
      }
    })();
  }, []);

  // Auto-switch to the best available model when the current one is locked.
  useEffect(() => {
    if (available.length && !available.some((m) => m.id === model)) {
      onModelChange(available[0].id);
    }
  }, [plan, model, onModelChange, available]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        value={isCurrentModelLocked ? (available[0]?.id ?? model) : model}
        onValueChange={onModelChange}
      >
        <SelectTrigger
          size="sm"
          className="max-w-[200px] min-w-[140px]"
          aria-label="Lecture model"
        >
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          {all.map((m) => {
            const locked =
              (PLAN_RANK[m.minPlan] ?? 0) >
              (PLAN_RANK[(plan?.toUpperCase() as PlanId) ?? "FREE"] ?? 0);
            return (
              <SelectItem
                key={m.id}
                value={m.id}
                disabled={locked}
                className={locked ? "opacity-50 cursor-not-allowed" : undefined}
              >
                <span className="flex items-center gap-1.5">
                  {locked && <span aria-hidden>🔒</span>}
                  <span>{m.label}</span>
                  {m.badge && (
                    <span className="ml-1 rounded px-1 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground leading-none">
                      {m.badge}
                    </span>
                  )}
                  {locked && (
                    <span className="text-[10px] text-muted-foreground">
                      ({PLAN_LABEL[m.minPlan]})
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {hasLockedModels && (
        <Link
          href="/pricing"
          className="text-[11px] text-[var(--muted-2)] underline-offset-2 hover:text-foreground hover:underline"
        >
          Upgrade models
        </Link>
      )}

      {onDurationChange && (
        <Select
          value={durationValue}
          onValueChange={(v) =>
            onDurationChange(v === "auto" ? undefined : Number(v))
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-[110px]"
            aria-label="Lecture length"
          >
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((d) => (
              <SelectItem
                key={d.label}
                value={d.value == null ? "auto" : String(d.value)}
              >
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

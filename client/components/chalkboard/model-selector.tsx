"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  DURATION_OPTIONS,
  getModelLabel,
  modelsForPlan,
} from "@/lib/chalkboard-api";
import { readJsonSafe } from "@/lib/http";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const known = available.some((m) => m.id === model);
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

  useEffect(() => {
    if (available.length && !available.some((m) => m.id === model)) {
      onModelChange(available[0].id);
    }
  }, [plan, model, onModelChange, available]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger
          size="sm"
          className="max-w-[200px] min-w-[140px]"
          aria-label="Lecture model"
        >
          <SelectValue placeholder="Model" />
        </SelectTrigger>
        <SelectContent>
          {!known && (
            <SelectItem value={model}>{getModelLabel(model)}</SelectItem>
          )}
          {available.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {plan !== "PRO" && (
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

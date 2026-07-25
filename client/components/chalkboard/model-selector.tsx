"use client";

import { ChevronDown } from "lucide-react";

import {
  DURATION_OPTIONS,
  LECTURE_MODELS,
  getModelLabel,
} from "@/lib/chalkboard-api";
import { cn } from "@/lib/utils";

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
  const known = LECTURE_MODELS.some((m) => m.id === model);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <label className="relative inline-flex min-w-0 items-center">
        <span className="sr-only">Model</span>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="lime-focus appearance-none truncate border border-white/12 bg-black/60 py-1.5 pl-2.5 pr-7 text-[11px] text-zinc-200 outline-none max-w-[200px]"
        >
          {!known && <option value={model}>{getModelLabel(model)}</option>}
          {LECTURE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 size-3 text-zinc-600"
          strokeWidth={1.5}
        />
      </label>

      {onDurationChange && (
        <label className="relative inline-flex items-center">
          <span className="sr-only">Duration</span>
          <select
            value={duration == null ? "auto" : String(duration)}
            onChange={(e) => {
              const v = e.target.value;
              onDurationChange(v === "auto" ? undefined : Number(v));
            }}
            className="lime-focus appearance-none border border-white/12 bg-black/60 py-1.5 pl-2.5 pr-7 text-[11px] text-zinc-200 outline-none"
          >
            {DURATION_OPTIONS.map((d) => (
              <option
                key={d.label}
                value={d.value == null ? "auto" : String(d.value)}
              >
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 size-3 text-zinc-600"
            strokeWidth={1.5}
          />
        </label>
      )}
    </div>
  );
}

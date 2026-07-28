"use client";

import {
  DURATION_OPTIONS,
  LECTURE_MODELS,
  getModelLabel,
} from "@/lib/chalkboard-api";
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
  const known = LECTURE_MODELS.some((m) => m.id === model);
  const durationValue = duration == null ? "auto" : String(duration);

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
          {LECTURE_MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

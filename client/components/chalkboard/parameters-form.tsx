"use client";

import { useMemo, useState } from "react";

import { LECTURE_MODEL_OPTIONS } from "@/lib/chalkboard-api";
import type { VisualStyle } from "@/lib/chalkboard-types";
import { cn } from "@/lib/utils";

export const VISUAL_STYLES: VisualStyle[] = [
  "BRUTALIST",
  "NEON_NOIR",
  "ANALOG_CRT",
  "MINIMAL_OS",
];

function SegmentedGauge({
  value,
  max,
  segments = 24,
  className,
}: {
  value: number;
  max: number;
  segments?: number;
  className?: string;
}) {
  const filled = useMemo(
    () => Math.min(segments, Math.round((value / max) * segments)),
    [value, max, segments]
  );
  return (
    <div
      className={cn("grid h-3 w-full gap-px", className)}
      style={{
        gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))`,
      }}
      role="img"
      aria-label={`${value} of ${max}`}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "min-h-0 min-w-0 transition-colors duration-200 ease-out",
            i < filled ? "bg-[#dfff00]" : "bg-zinc-800"
          )}
        />
      ))}
    </div>
  );
}

function ParamRow({
  label,
  value,
  onChange,
  max,
  display,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  display: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] tracking-[0.14em] text-zinc-500">
          {label}
        </span>
        <span className="tabular-nums text-[11px] text-[#dfff00]">{display}</span>
      </div>
      <div className="relative">
        <SegmentedGauge value={value} max={max} />
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between border border-white/10 bg-black/40 px-3 py-2.5 text-left transition-colors duration-200 hover:border-white/20"
    >
      <span className="max-w-[70%] text-[10px] tracking-[0.12em] text-zinc-400">
        {label}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 border transition-colors duration-200",
          on
            ? "border-[#dfff00] bg-[#dfff00] chalk-lime-glow"
            : "border-zinc-700 bg-zinc-900"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 border transition-transform duration-200 ease-out",
            on
              ? "left-4 border-black bg-black"
              : "left-0.5 border-zinc-600 bg-zinc-800"
          )}
        />
      </span>
    </button>
  );
}

export function ParametersForm({
  model,
  onModelChange,
}: {
  model: string;
  onModelChange: (model: string) => void;
}) {
  const [complexity, setComplexity] = useState(8.4);
  const [tonal, setTonal] = useState(3.2);
  const [temporal, setTemporal] = useState(5.0);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("BRUTALIST");
  const [autoCorrect, setAutoCorrect] = useState(true);
  const [neuralStab, setNeuralStab] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-black/20">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-200">
          PARAMETERS
        </h2>
        <p className="mt-0.5 text-[10px] tracking-[0.16em] text-zinc-600">
          API: /generate-lecture
        </p>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label
            htmlFor="llm-model"
            className="mb-1.5 block text-[10px] tracking-[0.14em] text-zinc-500"
          >
            LLM_MODEL
          </label>
          <select
            id="llm-model"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="lime-focus w-full border border-white/12 bg-black/60 px-2 py-2 text-[11px] text-zinc-200"
          >
            {!(LECTURE_MODEL_OPTIONS as readonly string[]).includes(model) ? (
              <option value={model}>{model}</option>
            ) : null}
            {LECTURE_MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">
            Sent as <code className="text-zinc-500">model</code> to the FastAPI
            backend (OpenRouter-style id).
          </p>
        </div>

        <div className="space-y-4">
          <ParamRow
            label="COMPLEXITY"
            value={complexity}
            max={10}
            display={complexity.toFixed(1)}
            onChange={setComplexity}
          />
          <ParamRow
            label="TONAL_GRAVITY"
            value={tonal}
            max={10}
            display={tonal.toFixed(1)}
            onChange={setTonal}
          />
          <ParamRow
            label="TEMPORAL_DENSITY"
            value={temporal}
            max={10}
            display={temporal.toFixed(1)}
            onChange={setTemporal}
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] tracking-[0.14em] text-zinc-500">
            VISUAL_STYLE
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VISUAL_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setVisualStyle(s)}
                className={cn(
                  "border px-2 py-2.5 text-[10px] tracking-[0.12em] transition-all duration-200",
                  visualStyle === s
                    ? "border-[#dfff00] bg-[#dfff00]/10 text-[#dfff00]"
                    : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <SwitchRow
            label="AUTO_CORRECT"
            on={autoCorrect}
            onToggle={() => setAutoCorrect((v) => !v)}
          />
          <SwitchRow
            label="NEURAL_STABILIZATION"
            on={neuralStab}
            onToggle={() => setNeuralStab((v) => !v)}
          />
        </div>
      </div>
    </div>
  );
}

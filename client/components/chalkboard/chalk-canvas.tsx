"use client";

import { useEffect, useMemo, useState } from "react";

import type { ThreadVideo } from "@/lib/chalkboard-types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Phase pipeline
// ---------------------------------------------------------------------------

type PipelineStep = {
  key: string;
  label: string;
};

const PIPELINE: PipelineStep[] = [
  { key: "planning", label: "Planning animation" },
  { key: "generating_audio", label: "Generating narration" },
  { key: "generating_code", label: "Writing animation code" },
  { key: "merging", label: "Rendering & combining" },
  { key: "uploading", label: "Uploading" },
];

// Map every raw phase → pipeline step index (-1 = not started / unknown)
function phaseIndex(phase: string | null | undefined): number {
  switch (phase) {
    case "routing":
    case "planning":
      return 0;
    case "generating_audio":
      return 1;
    case "generating_code":
      return 2;
    case "processing":
    case "merging":
      return 3;
    case "uploading":
      return 4;
    default:
      return -1;
  }
}

// ---------------------------------------------------------------------------
// Elapsed timer hook
// ---------------------------------------------------------------------------

function useElapsed(startMs: number | undefined, active: boolean): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active || startMs == null) return;
    function tick() {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs!) / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [active, startMs]);

  if (!active) return "";
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")} elapsed`;
}

// ---------------------------------------------------------------------------
// Waveform animation
// ---------------------------------------------------------------------------

const WAVE_BARS = 12;
const WAVE_KEYFRAMES = `
@keyframes wave-bar {
  0%, 100% { transform: scaleY(0.15); opacity: 0.35; }
  50%       { transform: scaleY(1);    opacity: 1;    }
}
@keyframes dot-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.7); }
  50%       { opacity: 1;   transform: scale(1);   }
}
@keyframes spin-slow {
  to { transform: rotate(360deg); }
}
`;

function WaveformLoader({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height: 36 }}
      aria-hidden
    >
      {Array.from({ length: WAVE_BARS }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[var(--mm-accent)]"
          style={
            active
              ? {
                  height: "100%",
                  animation: `wave-bar 1.1s ease-in-out infinite`,
                  animationDelay: `${(i * 1.1) / WAVE_BARS}s`,
                  transformOrigin: "bottom",
                }
              : {
                  height: "15%",
                  opacity: 0.2,
                  backgroundColor: "var(--mm-accent)",
                }
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase progress indicator
// ---------------------------------------------------------------------------

function PhaseProgress({
  phase,
  status,
}: {
  phase: string | null | undefined;
  status: "queued" | "processing" | "completed" | "failed";
}) {
  const current = phaseIndex(phase);
  const isRendering = status === "queued" || status === "processing";

  return (
    <ol className="flex flex-col gap-[6px]">
      {PIPELINE.map((step, idx) => {
        const done = isRendering ? idx < current : status === "completed";
        const active = isRendering && idx === current;
        const future = isRendering && idx > current;

        return (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2 text-[11px] transition-colors duration-300",
              done && "text-[var(--mm-accent)]",
              active && "text-foreground",
              future && "text-[var(--muted-2)]",
              !isRendering && !done && "text-[var(--muted-2)]",
            )}
          >
            <span className="flex size-[14px] shrink-0 items-center justify-center text-[10px]">
              {done ? (
                "✓"
              ) : active ? (
                <span
                  style={{
                    display: "inline-block",
                    animation: "dot-pulse 1.2s ease-in-out infinite",
                  }}
                >
                  ●
                </span>
              ) : (
                <span className="block size-[5px] rounded-full bg-current opacity-40" />
              )}
            </span>
            <span className={cn(active && "font-medium")}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Spinner icon
// ---------------------------------------------------------------------------

function SpinnerIcon() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{ animation: "spin-slow 0.9s linear infinite" }}
      className="shrink-0"
    >
      <circle
        cx="6"
        cy="6"
        r="4.5"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M6 1.5A4.5 4.5 0 0 1 10.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status label for sidebar
// ---------------------------------------------------------------------------

function StatusBadge({ v }: { v: ThreadVideo }) {
  switch (v.status) {
    case "completed":
      return (
        <span className="text-[var(--mm-accent)]" title="Done">
          ✓
        </span>
      );
    case "failed":
      return (
        <span className="text-red-400" title="Failed">
          ✗
        </span>
      );
    case "processing":
      return (
        <span
          title="Processing"
          style={{ animation: "dot-pulse 1.4s ease-in-out infinite" }}
          className="text-[var(--mm-accent)]"
        >
          ●
        </span>
      );
    case "queued":
    default:
      return (
        <span className="text-[var(--muted-2)]" title="Queued">
          …
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChalkCanvas({
  videos,
  onRender,
  renderDisabled,
}: {
  videos: ThreadVideo[];
  onRender: () => void | Promise<void>;
  renderDisabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const resolvedId = useMemo(() => {
    if (pickedId != null && videos.some((v) => v.id === pickedId))
      return pickedId;
    return videos[0]?.id ?? null;
  }, [pickedId, videos]);

  const activeVideo = useMemo(
    () =>
      videos.find((v) => v.id === resolvedId) ??
      videos.find((v) => v.status !== "failed") ??
      videos[0],
    [videos, resolvedId],
  );

  const rendering =
    activeVideo?.status === "queued" || activeVideo?.status === "processing";

  const elapsedStr = useElapsed(activeVideo?.createdAt, rendering);

  async function handleRender() {
    if (busy || renderDisabled) return;
    setBusy(true);
    try {
      await onRender();
    } finally {
      setBusy(false);
    }
  }

  const progressCopy = rendering
    ? [
        activeVideo?.message || "Building lecture…",
        activeVideo?.etaDisplay ? `Usually ${activeVideo.etaDisplay}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : activeVideo?.status === "completed"
      ? "Video ready"
      : "Waiting to generate";

  const isWorking = busy || rendering;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {/* Inject keyframes once */}
      <style>{WAVE_KEYFRAMES}</style>

      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="mm-label">Output</p>
          <p className="mt-0.5 text-[12px] text-[var(--muted-text)]">
            {progressCopy}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRender}
          disabled={isWorking || renderDisabled}
          className="mm-pixel-btn flex items-center gap-2 px-4 py-2"
        >
          {isWorking && <SpinnerIcon />}
          {isWorking ? "Working…" : "Generate"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {videos.length > 0 && (
          <aside className="flex w-full shrink-0 gap-1 overflow-x-auto border-b border-[var(--chip-line)] p-2 md:w-[140px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r">
            {videos.map((v) => {
              const active = activeVideo?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setPickedId(v.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 px-2 py-2 text-left text-[10px] transition-colors md:w-full",
                    active
                      ? "rounded-[9px] bg-[var(--chip)] text-foreground"
                      : "rounded-[9px] text-[var(--muted-text)] hover:bg-[var(--chip)] hover:text-[var(--ink-soft)]",
                  )}
                >
                  <span className="line-clamp-1 flex-1">{v.title}</span>
                  <span className="shrink-0 text-[10px]">
                    <StatusBadge v={v} />
                  </span>
                </button>
              );
            })}
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <div className="mm-panel mm-scan relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative z-[1] min-h-0 flex-1 bg-[#0a0a09]">
              {activeVideo?.status === "completed" &&
              activeVideo.videoUrl &&
              activeVideo.videoUrl.length > 0 ? (
                <video
                  key={activeVideo.videoUrl}
                  className="size-full max-h-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                  src={activeVideo.videoUrl}
                />
              ) : activeVideo?.status === "failed" ? (
                <div className="flex size-full items-center justify-center p-6">
                  <p className="max-w-md text-center text-[12px] leading-relaxed text-red-300/90">
                    {activeVideo.error ?? "Generation failed."}
                  </p>
                </div>
              ) : (
                // Loading / idle state
                <div className="flex size-full flex-col items-center justify-center gap-5 p-6">
                  {/* Waveform */}
                  <WaveformLoader active={rendering} />

                  {/* Status message */}
                  <p className="max-w-[260px] text-center text-[12px] leading-relaxed text-[var(--muted-text)]">
                    {rendering
                      ? activeVideo?.message ||
                        "Narration → code → render → merge in progress"
                      : "Hit Generate to render this lecture"}
                  </p>

                  {/* Elapsed + ETA row */}
                  {rendering && (
                    <div className="flex items-center gap-3 text-[11px] text-[var(--muted-2)]">
                      {elapsedStr && <span>{elapsedStr}</span>}
                      {elapsedStr && activeVideo?.etaDisplay && (
                        <span className="opacity-40">·</span>
                      )}
                      {activeVideo?.etaDisplay && (
                        <span>Usually {activeVideo.etaDisplay}</span>
                      )}
                    </div>
                  )}

                  {/* Phase progress */}
                  {rendering && (
                    <div className="mt-1 w-full max-w-[200px]">
                      <PhaseProgress
                        phase={activeVideo?.phase}
                        status={activeVideo?.status ?? "queued"}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

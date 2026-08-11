"use client";

import { useMemo, useState } from "react";

import type { ThreadVideo } from "@/lib/chalkboard-types";
import { cn } from "@/lib/utils";

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
    if (pickedId != null && videos.some((v) => v.id === pickedId)) return pickedId;
    return videos[0]?.id ?? null;
  }, [pickedId, videos]);

  const activeVideo = useMemo(
    () =>
      videos.find((v) => v.id === resolvedId) ??
      videos.find((v) => v.status !== "failed") ??
      videos[0],
    [videos, resolvedId]
  );

  async function handleRender() {
    if (busy || renderDisabled) return;
    setBusy(true);
    try {
      await onRender();
    } finally {
      setBusy(false);
    }
  }

  function statusLabel(v: ThreadVideo) {
    switch (v.status) {
      case "completed":
        return "done";
      case "failed":
        return "err";
      case "processing":
        return "…";
      case "queued":
      default:
        return "queue";
    }
  }

  const rendering =
    activeVideo?.status === "queued" || activeVideo?.status === "processing";

  const progressCopy = rendering
    ? [
        activeVideo?.message || "Building lecture…",
        activeVideo?.etaDisplay
          ? `Usually ${activeVideo.etaDisplay}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : activeVideo?.status === "completed"
      ? "Video ready"
      : "Waiting to generate";

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
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
          disabled={busy || renderDisabled}
          className="mm-pixel-btn px-4 py-2"
        >
          {busy || rendering ? "Working…" : "Generate"}
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
                      : "rounded-[9px] text-[var(--muted-text)] hover:bg-[var(--chip)] hover:text-[var(--ink-soft)]"
                  )}
                >
                  <span className="line-clamp-1 flex-1">{v.title}</span>
                  <span className="shrink-0 text-[9px] text-[var(--muted-2)]">
                    {statusLabel(v)}
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
                <div className="flex size-full flex-col items-center justify-center gap-3 p-6">
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: "repeat(5, 8px)" }}
                    aria-hidden
                  >
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "size-2",
                          rendering && i % 3 === 0
                            ? "bg-[var(--mm-accent)]"
                            : "bg-zinc-800"
                        )}
                      />
                    ))}
                  </div>
                  <p className="max-w-[280px] text-center text-[12px] leading-relaxed text-[var(--muted-text)]">
                    {rendering
                      ? activeVideo?.message ||
                        "Narration → code → render → merge in progress"
                      : "Hit Generate to render this lecture"}
                  </p>
                  {rendering && activeVideo?.etaDisplay ? (
                    <p className="text-[11px] text-[var(--muted-2)]">
                      ETA {activeVideo.etaDisplay}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

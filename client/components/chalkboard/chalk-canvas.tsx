"use client";

import { ChevronDown, GripVertical, Play, RotateCcw, SkipForward } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { ThreadVideo } from "@/lib/chalkboard-types";
import { cn } from "@/lib/utils";

export function ChalkCanvas({
  videos,
  onRender,
}: {
  videos: ThreadVideo[];
  onRender: () => void | Promise<void>;
}) {
  const [live, setLive] = useState(true);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** User-picked render; falls back automatically if the clip is gone. */
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
    [videos, resolvedId]
  );

  async function handleRender() {
    if (busy) return;
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
        return "DONE";
      case "failed":
        return "ERR";
      case "processing":
        return "···";
      case "queued":
      default:
        return "Q";
    }
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[#060606]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] text-zinc-500">CANVAS</p>
            <p className="truncate text-[11px] text-zinc-300">
              R2 stream · lecture video
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="flex items-center gap-2 rounded-sm border border-white/10 px-2 py-1 text-[10px] tracking-[0.12em] text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
          >
            <span
              className={cn(
                "size-1.5 transition-colors duration-200",
                live ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "bg-zinc-600"
              )}
            />
            {live ? "LIVE" : "OFF"}
          </button>
          <button
            type="button"
            onClick={handleRender}
            disabled={busy}
            className="border border-[#dfff00] bg-[#dfff00] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-black transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "…" : "RENDER"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-row gap-px overflow-x-auto border-b border-white/10 bg-black md:w-[168px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r md:border-white/10">
          <div className="hidden items-center justify-between px-2 py-2 md:flex md:border-b md:border-white/10">
            <span className="text-[9px] tracking-[0.16em] text-zinc-600">RENDERS</span>
            <ChevronDown className="size-3 text-zinc-600 md:rotate-[270deg]" />
          </div>
          {videos.length === 0 ? (
            <p className="px-3 py-4 text-[10px] leading-relaxed text-zinc-600 md:border-0 md:px-2">
              No renders yet. RENDER calls POST /generate-lecture and polls /jobs/:id
              until the MP4 URL is ready.
            </p>
          ) : (
            videos.map((v) => {
              const active = activeVideo?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setPickedId(v.id)}
                  className={cn(
                    "flex w-full shrink-0 items-center gap-2 border border-transparent px-2 py-2.5 text-left text-[10px] tracking-[0.08em] transition-colors duration-200 md:border-b md:border-white/[0.06]",
                    active
                      ? "bg-[#dfff00]/10 text-[#dfff00] md:border-l-2 md:border-l-[#dfff00] md:pl-[6px]"
                      : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                  )}
                >
                  <span className="line-clamp-2 flex-1">{v.title}</span>
                  <span className="shrink-0 tabular-nums text-[9px] text-zinc-600">
                    {statusLabel(v)}
                  </span>
                </button>
              );
            })
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="chalk-panel m-3 flex min-h-0 flex-1 flex-col border">
            <div className="relative min-h-0 flex-1 bg-black">
              {activeVideo?.status === "completed" &&
              activeVideo.videoUrl &&
              activeVideo.videoUrl.length > 0 ? (
                <video
                  ref={videoRef}
                  key={activeVideo.videoUrl}
                  className="size-full max-h-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                  src={activeVideo.videoUrl}
                />
              ) : activeVideo?.status === "failed" ? (
                <div className="flex size-full items-center justify-center border border-dashed border-red-500/30 bg-red-950/20 p-4">
                  <p className="max-w-md text-center text-[11px] leading-relaxed text-red-200/90">
                    {activeVideo.error ?? "Generation failed."}
                  </p>
                </div>
              ) : (
                <div className="flex size-full items-center justify-center border border-dashed border-white/10 bg-zinc-950/80">
                  <p className="max-w-[280px] px-4 text-center text-[11px] leading-relaxed tracking-[0.08em] text-zinc-500">
                    {activeVideo?.status === "processing"
                      ? "Processing on the server (Manim + audio + R2 upload)…"
                      : activeVideo?.status === "queued"
                        ? "Queued…"
                        : "Select RENDER to generate a lecture video from this thread."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <footer className="mx-3 mb-3 flex shrink-0 items-center gap-2 border border-white/10 bg-black/60 px-2 py-2">
            <div className="flex items-center gap-0.5 text-zinc-500">
              <button
                type="button"
                onClick={() => void videoRef.current?.play()}
                className="p-2 transition-colors hover:text-[#dfff00]"
                aria-label="Play"
              >
                <Play className="size-4" />
              </button>
              <button
                type="button"
                className="p-2 transition-colors hover:text-[#dfff00]"
                aria-label="Skip"
              >
                <SkipForward className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = videoRef.current;
                  if (el) {
                    el.currentTime = 0;
                    void el.play();
                  }
                }}
                className="p-2 transition-colors hover:text-[#dfff00]"
                aria-label="Restart"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex justify-between text-[9px] tracking-[0.14em] text-zinc-600">
                <span>OUTPUT</span>
                <span className="text-[#dfff00]">
                  {activeVideo?.status === "completed"
                    ? "READY"
                    : activeVideo?.status === "failed"
                      ? "FAIL"
                      : "…"}
                </span>
              </div>
              <div className="h-1 w-full bg-zinc-800">
                <div
                  className="h-full bg-[#dfff00] transition-[width] duration-300"
                  style={{
                    width:
                      activeVideo?.status === "completed"
                        ? "100%"
                        : activeVideo?.status === "processing"
                          ? "66%"
                          : activeVideo?.status === "queued"
                            ? "22%"
                            : "12%",
                  }}
                />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}

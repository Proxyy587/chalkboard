"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChalkCanvas } from "@/components/chalkboard/chalk-canvas";
import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { ModelSelector } from "@/components/chalkboard/model-selector";
import { NavigateHome } from "@/components/chalkboard/navigate-home";
import { getModelLabel, setPreferredModel } from "@/lib/chalkboard-api";
import { cn } from "@/lib/utils";

export default function ThreadPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const {
    hydrated,
    getThread,
    setThreadPrompt,
    setThreadModel,
    setThreadDuration,
    startLectureRender,
  } = useChalkboard();
  const thread = id ? getThread(id) : undefined;

  const prompt =
    thread?.messages.find((m) => m.role === "user")?.content ?? "";
  const [draft, setDraft] = useState(prompt);

  useEffect(() => {
    setDraft(prompt);
  }, [prompt, id]);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-[var(--muted-2)]">
        Loading…
      </div>
    );
  }

  if (!thread) {
    return hydrated && id ? <NavigateHome /> : null;
  }

  const dirty = draft.trim() !== prompt.trim();
  const canGenerate = Boolean(draft.trim());

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      <div
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-[var(--chip-line)]",
          "min-h-[38vh] flex-1 lg:h-full lg:w-[min(380px,40vw)] lg:flex-none lg:border-r"
        )}
      >
        <div className="shrink-0 border-b border-[var(--chip-line)] px-4 py-3">
          <p className="mm-label">Prompt</p>
          <p className="mt-1 truncate text-[13px] text-[var(--ink-soft)]">{thread.title}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex min-h-0 flex-1 flex-col">
            <label htmlFor="thread-prompt" className="mm-label mb-2 block">
              Topic
            </label>
            <textarea
              id="thread-prompt"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="lime-focus min-h-[140px] flex-1 resize-none rounded-[10px] border border-[var(--chip-line)] bg-[var(--surface)] px-3 py-3 text-[13px] leading-relaxed text-foreground placeholder:text-[var(--muted-2)]"
              placeholder="Describe the lecture…"
            />
            {dirty && (
              <button
                type="button"
                className="mm-ghost-btn mt-2 self-start px-3 py-1.5 text-[10px]"
                onClick={() => setThreadPrompt(id, draft)}
              >
                Save prompt
              </button>
            )}
          </div>

          <div className="space-y-2">
            <p className="mm-label">Generation</p>
            <ModelSelector
              model={thread.model}
              duration={thread.duration}
              onModelChange={(m) => {
                setThreadModel(id, m);
                setPreferredModel(m);
              }}
              onDurationChange={(d) => setThreadDuration(id, d)}
            />
            <p className="text-[11px] leading-relaxed text-[var(--muted-2)]">
              {getModelLabel(thread.model)} · Generate runs script → Manim →
              narration → video.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChalkCanvas
          videos={thread.videos}
          renderDisabled={!canGenerate}
          onRender={async () => {
            await startLectureRender(id, draft, { duration: thread.duration });
          }}
        />
      </div>
    </div>
  );
}

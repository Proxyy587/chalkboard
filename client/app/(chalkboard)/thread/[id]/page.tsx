"use client";

import { ArrowUp } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ChalkCanvas } from "@/components/chalkboard/chalk-canvas";
import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { NavigateHome } from "@/components/chalkboard/navigate-home";
import { ParametersForm } from "@/components/chalkboard/parameters-form";
import { cn } from "@/lib/utils";

export default function ThreadPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { hydrated, getThread, appendUserMessage, setThreadModel, startLectureRender } =
    useChalkboard();
  const thread = id ? getThread(id) : undefined;

  const [draft, setDraft] = useState("");

  function send() {
    const text = draft.trim();
    if (!text || !id) return;
    appendUserMessage(id, text);
    setDraft("");
  }

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
        …
      </div>
    );
  }

  if (!thread) {
    return hydrated && id ? <NavigateHome /> : null;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      {/* Left: Claude-style rail — transcript + composer + parameters */}
      <div
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-white/10",
          "min-h-[40vh] flex-1 lg:h-full lg:max-h-full lg:w-[min(460px,44vw)] lg:min-h-0 lg:flex-none lg:border-r"
        )}
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-2">
          <p className="truncate text-[10px] tracking-[0.14em] text-zinc-500">
            THREAD
          </p>
          <p className="truncate text-[12px] text-zinc-200">{thread.title}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex w-full flex-col gap-3">
            {thread.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex w-full",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[min(100%,92%)] border px-3 py-2.5 text-[12px] font-normal leading-relaxed tracking-normal transition-colors duration-200",
                    m.role === "user"
                      ? "border-white/15 bg-white/[0.06] text-zinc-100"
                      : "border-white/10 bg-black/40 text-zinc-400"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-3 py-2">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Message this thread…"
              rows={2}
              className="lime-focus min-h-[48px] flex-1 resize-none border border-white/12 bg-black/50 px-3 py-2.5 text-[12px] text-zinc-200 placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="shrink-0 self-end border border-[#dfff00] bg-[#dfff00] px-3 py-2.5 text-[10px] font-semibold tracking-[0.12em] text-black transition-all hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex max-h-[min(36vh,340px)] min-h-[188px] shrink-0 flex-col overflow-hidden border-t border-white/10 bg-black/30">
          <ParametersForm
            model={thread.model}
            onModelChange={(m) => setThreadModel(id, m)}
          />
        </div>
      </div>

      {/* Right: full-height canvas (ChatGPT / Claude artifact) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-0">
        <ChalkCanvas
          videos={thread.videos}
          onRender={() => startLectureRender(id)}
        />
      </div>
    </div>
  );
}

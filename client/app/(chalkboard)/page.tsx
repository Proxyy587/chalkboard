"use client";

import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";

export default function LandingPage() {
  const router = useRouter();
  const { createThreadFromPrompt } = useChalkboard();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    const id = createThreadFromPrompt(text);
    setValue("");
    router.push(`/thread/${id}`);
    setBusy(false);
  }, [value, busy, createThreadFromPrompt, router]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl space-y-3">
          <p className="text-center text-[10px] tracking-[0.22em] text-zinc-600">
            CHALKBOARD
          </p>
          <h1 className="text-center text-xl font-semibold uppercase tracking-wide text-white md:text-2xl">
            What should we teach?
          </h1>
          <p className="text-center text-[12px] text-zinc-500">
            Each thread calls your FastAPI pipeline: LLM → Manim → audio → R2 URL in the canvas.
          </p>
          <div className="chalk-panel border opacity-100 transition-opacity duration-200">
            <label htmlFor="landing-input" className="sr-only">
              Lecture prompt
            </label>
            <textarea
              id="landing-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Describe the topic…"
              rows={4}
              className="lime-focus max-h-[40vh] w-full resize-none border-0 bg-transparent px-4 py-3 text-[13px] font-normal normal-case tracking-normal text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-2 py-2">
              <span className="mr-auto px-2 text-[10px] text-zinc-600">
                Enter to send · Shift+Enter newline
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim() || busy}
                className="flex items-center gap-1 border border-[#dfff00] bg-[#dfff00] px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                START_THREAD
                <ArrowUp className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

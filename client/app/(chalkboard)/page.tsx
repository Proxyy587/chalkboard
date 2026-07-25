"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { ModelSelector } from "@/components/chalkboard/model-selector";
import { PixelHeatmap } from "@/components/chalkboard/pixel-heatmap";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  DEFAULT_LECTURE_MODEL,
  getPreferredDuration,
  getPreferredModel,
  setPreferredDuration,
  setPreferredModel,
} from "@/lib/chalkboard-api";
import { cn } from "@/lib/utils";

const DEMO_PROMPTS = [
  {
    label: "Fourier",
    prompt:
      "Explain the Fourier transform with a clear visual intuition — start from a sum of waves and build toward frequency space.",
  },
  {
    label: "Bayes",
    prompt:
      "Teach Bayes' theorem with a medical testing example. Keep the math honest and the visuals minimal.",
  },
  {
    label: "Gradient",
    prompt:
      "Visualize gradient descent on a simple loss surface. Narrate each step so a first-year student can follow.",
  },
  {
    label: "Euler",
    prompt:
      "Show why e^{iπ} + 1 = 0 feels inevitable — rotation on the complex plane, not just a formula.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { createThreadFromPrompt } = useChalkboard();
  const [value, setValue] = useState("");
  const [model, setModel] = useState(DEFAULT_LECTURE_MODEL);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  useMountEffect(() => {
    setModel(getPreferredModel());
    setDuration(getPreferredDuration());
    setPrefsReady(true);
  });

  const submit = useCallback(
    (text: string) => {
      const prompt = text.trim();
      if (!prompt || busy) return;
      setBusy(true);
      setPreferredModel(model);
      setPreferredDuration(duration);
      const id = createThreadFromPrompt(prompt, { model, duration });
      setValue("");
      router.push(`/thread/${id}`);
    },
    [busy, createThreadFromPrompt, duration, model, router]
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-5 py-10 md:px-8">
        <header className="mm-enter space-y-4 text-center">
          <p className="mm-label inline-flex items-center gap-2">
            <span className="inline-block size-1.5 bg-[var(--mm-accent)]" />
            open demo · no account required
          </p>
          <h1 className="mm-brand text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            manimotion
          </h1>
          <p className="mx-auto max-w-md text-[13px] leading-relaxed text-zinc-500">
            Type a STEM idea. We turn it into a narrated motion lecture —
            Manim, audio, and a playable video.
            <span className="mm-cursor" aria-hidden />
          </p>
        </header>

        <div className="mm-enter mm-enter-delay-1 mm-panel">
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
                submit(value);
              }
            }}
            placeholder="What should we teach?"
            rows={4}
            className="lime-focus max-h-[36vh] w-full resize-none border-0 bg-transparent px-4 py-4 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-3 py-2.5">
            {prefsReady ? (
              <ModelSelector
                model={model}
                onModelChange={(m) => {
                  setModel(m);
                  setPreferredModel(m);
                }}
                duration={duration}
                onDurationChange={(d) => {
                  setDuration(d);
                  setPreferredDuration(d);
                }}
              />
            ) : (
              <div className="h-7 w-40 bg-zinc-900" />
            )}
            <button
              type="button"
              onClick={() => submit(value)}
              disabled={!value.trim() || busy}
              className="mm-pixel-btn inline-flex items-center gap-2 px-4 py-2"
            >
              Generate
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mm-enter mm-enter-delay-2 space-y-3">
          <p className="mm-label">Try a starter</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={busy}
                onClick={() => submit(item.prompt)}
                className={cn(
                  "mm-ghost-btn group flex flex-col items-start gap-1.5 px-3 py-3 text-left",
                  "hover:border-[var(--mm-accent)]/40"
                )}
              >
                <span className="text-[11px] tracking-[0.12em] text-[var(--mm-accent)]">
                  {item.label}
                </span>
                <span className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                  {item.prompt}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mm-enter mm-enter-delay-3 border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="mm-label">Activity</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Local demos · pixels light up as you create
              </p>
            </div>
          </div>
          <PixelHeatmap />
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { ModelSelector } from "@/components/chalkboard/model-selector";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  DEFAULT_LECTURE_MODEL,
  getPreferredDuration,
  getPreferredModel,
  setPreferredDuration,
  setPreferredModel,
} from "@/lib/chalkboard-api";

const DEMO_PROMPTS = [
  {
    n: "01",
    label: "Fourier series",
    prompt:
      "Explain the Fourier transform with a clear visual intuition — start from a sum of waves and build toward frequency space.",
  },
  {
    n: "02",
    label: "Bayes' theorem",
    prompt:
      "Teach Bayes' theorem with a medical testing example. Keep the math honest and the visuals minimal.",
  },
  {
    n: "03",
    label: "Gradient descent",
    prompt:
      "Visualize gradient descent on a simple loss surface. Narrate each step so a first-year student can follow.",
  },
  {
    n: "04",
    label: "Euler's identity",
    prompt:
      "Show why e^{iπ} + 1 = 0 feels inevitable — rotation on the complex plane, not just a formula.",
  },
];

const FEATURES = [
  {
    n: "01",
    title: "Beat-sheet sync",
    body: "Visuals, narration, and timing share one plan — audio before render.",
  },
  {
    n: "02",
    title: "Manim + Remotion",
    body: "Math engines and motion graphics, routed automatically or forced.",
  },
  {
    n: "03",
    title: "BYO storage",
    body: "Ship MP4s to your R2/S3 bucket with hashed API keys.",
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-10 md:px-10 md:py-14">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-[12px] font-medium text-neutral-500">
              Open demo · no account required
            </p>
            <h1 className="mt-3 max-w-lg text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-white md:text-[2.85rem]">
              video content as motion graphics.
            </h1>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-neutral-500">
              Describe a topic. We plan beats, narrate, animate with Manim or
              Remotion, and sync audio to the cut.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => document.getElementById("landing-input")?.focus()}
                className="inline-flex h-9 items-center bg-white px-4 text-[13px] font-semibold text-black hover:bg-neutral-200"
              >
                Get started
              </button>
              <Link
                href="/docs"
                className="inline-flex h-9 items-center border border-white/15 px-4 text-[13px] font-medium text-neutral-200 hover:bg-white/[0.03]"
              >
                Docs
              </Link>
            </div>
          </div>

          <div className="mm-grain relative min-h-[180px] overflow-hidden border border-white/10 bg-neutral-950 p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
            <p className="relative text-[11px] font-medium tracking-[0.14em] text-neutral-500">
              MANIMOTION
            </p>
            <p className="relative mt-6 text-[22px] font-semibold tracking-tight text-white">
              prompt → beat sheet → video
            </p>
            <p className="relative mt-2 text-[12px] text-neutral-500">
              TTS first. Render second. Sync by design.
            </p>
          </div>
        </section>

        <section className="border border-white/10 bg-neutral-950">
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
            className="lime-focus w-full resize-none border-0 bg-transparent px-5 pt-5 pb-3 text-[15px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
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
              <div className="h-8 w-40 animate-pulse bg-neutral-900" />
            )}
            <button
              type="button"
              onClick={() => submit(value)}
              disabled={!value.trim() || busy}
              className="mm-pixel-btn inline-flex h-9 items-center gap-1.5 px-4 disabled:opacity-40"
            >
              Generate
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        </section>

        <section>
          <p className="mb-3 text-[12px] font-medium text-neutral-500">Try a starter</p>
          <div className="grid border border-white/10 sm:grid-cols-2">
            {DEMO_PROMPTS.map((item, i) => (
              <button
                key={item.label}
                type="button"
                disabled={busy}
                onClick={() => submit(item.prompt)}
                className={`mm-feature-cell group mm-grain bg-black p-5 text-left transition-colors hover:bg-neutral-950 ${
                  i % 2 === 1 ? "sm:border-r-0" : ""
                } ${i >= 2 ? "border-b-0" : ""}`}
              >
                <p className="text-[11px] text-neutral-600">{item.n}</p>
                <p className="mt-2 text-[14px] font-semibold tracking-tight text-white group-hover:underline">
                  {item.label}
                </p>
                <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-3 text-[12px] font-medium text-neutral-500">Why it works</p>
          <div className="grid border border-white/10 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.n}
                className={`mm-feature-cell mm-grain bg-black p-5 ${
                  i === FEATURES.length - 1 ? "md:border-r-0" : ""
                } border-b-0`}
              >
                <p className="text-[11px] text-neutral-600">{f.n}</p>
                <p className="mt-3 text-[14px] font-semibold tracking-tight text-white">
                  {f.title}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

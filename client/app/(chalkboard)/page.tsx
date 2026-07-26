"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useChalkboard } from "@/components/chalkboard/chalkboard-context";
import { ModelSelector } from "@/components/chalkboard/model-selector";
import { AccountMenu, HistoryMenu } from "@/components/account/account-menu";
import { LandingMark } from "@/components/landing/landing-mark";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { useSession } from "@/lib/auth-client";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  DEFAULT_LECTURE_MODEL,
  getPreferredDuration,
  getPreferredModel,
  setPreferredDuration,
  setPreferredModel,
} from "@/lib/chalkboard-api";
import "@/app/landing.css";

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
    title: "Public API",
    body: "x-api-key auth, async jobs, BYO R2/S3 storage when you need it.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { createThreadFromPrompt } = useChalkboard();
  const { data: session } = useSession();
  const [value, setValue] = useState("");
  const [model, setModel] = useState(DEFAULT_LECTURE_MODEL);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);

  useMountEffect(() => {
    setModel(getPreferredModel());
    setDuration(getPreferredDuration());
    setPrefsReady(true);
  });

  useEffect(() => {
    if (!rootEl) return;
    const el = rootEl;
    function onScroll() {
      setScrolled(el.scrollTop > 48);
    }
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [rootEl]);

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
    [busy, createThreadFromPrompt, duration, model, router],
  );

  async function copyCmd() {
    await navigator.clipboard.writeText(
      'curl -X POST "$MANIMOTION_API/video/request" -H "x-api-key: $KEY"',
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div ref={setRootEl} className="lp-root">
      <div className={`lp-corner ${scrolled ? "hide" : ""}`}>
        <span>v0.1</span>
        {!session?.user && <HistoryMenu />}
        <ThemeToggle />
      </div>

      <header className={`lp-topbar ${scrolled ? "show" : ""}`}>
        <Link href="/" className="brand">
          manimotion
        </Link>
        <div className="spacer" />
        <Link href="/docs" className="lp-topbar-link desktop-only">
          Docs
        </Link>
        <Link href="/settings" className="lp-topbar-link desktop-only">
          Settings
        </Link>
        {session?.user ? (
          <AccountMenu />
        ) : (
          <>
            <HistoryMenu />
            <Link href="/sign-in" className="lp-topbar-link">
              Sign in
            </Link>
          </>
        )}
        <span className="ver">v0.1</span>
        <ThemeToggle />
      </header>

      <section className="lp-hero">
        <h1 className="lp-wordmark">manimotion</h1>
        <LandingMark />
        <p className="lp-subtitle">
          STEM lectures as motion graphics — for talks, tutors, and products.
        </p>
        <p className="lp-position">
          Describe a topic. We plan beats, narrate, animate with <b>Manim</b> or{" "}
          <b>Remotion</b>, and sync audio to the cut. Open demo — no account
          required.
        </p>

        <div className="lp-cmd">
          <code>
            curl -X POST https://api.manimotion.dev/video/request -H
            &quot;x-api-key: $KEY&quot;
          </code>
          <button type="button" className="copy" onClick={() => void copyCmd()}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="lp-cta-row">
          <button
            type="button"
            className="lp-btn primary"
            onClick={() => document.getElementById("landing-input")?.focus()}
          >
            Try the demo
            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
          </button>
          <Link href="/docs" className="lp-btn">
            <BookOpen className="size-3.5" strokeWidth={1.5} />
            Read the docs
          </Link>
        </div>

        <p className="lp-linkrow">
          <Link href="/docs/quickstart">Quickstart</Link>
          <span className="dot">·</span>
          <Link href="/docs/api">API</Link>
          <span className="dot">·</span>
          <Link href="/settings/api-keys">Get an API key</Link>
        </p>
      </section>

      <hr className="lp-rule" />

      <div className="lp-wrap">
        <article className="lp-article">
          <section id="generate">
            <h2>Generate a lecture</h2>
            <p>
              Type a STEM topic below. Pick a model and length if you want —
              then generate. Threads stay in your browser until you sign in.
            </p>

            <div className="lp-composer">
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
              />
              <div className="lp-composer-bar">
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
                  <div className="h-8 w-40 animate-pulse rounded bg-[var(--lp-line-soft)]" />
                )}
                <button
                  type="button"
                  className="lp-btn primary"
                  disabled={!value.trim() || busy}
                  onClick={() => submit(value)}
                  style={{ opacity: !value.trim() || busy ? 0.4 : 1 }}
                >
                  Generate
                  <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </section>

          <section id="starters">
            <h2>Try a starter</h2>
            <p>One click. Same pipeline as a blank prompt.</p>
            <div className="lp-starters">
              {DEMO_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="lp-starter"
                  disabled={busy}
                  onClick={() => submit(item.prompt)}
                >
                  <div className="n">{item.n}</div>
                  <div className="t">{item.label}</div>
                  <div className="b">{item.prompt}</div>
                </button>
              ))}
            </div>
          </section>

          <section id="why">
            <h2>Why it works</h2>
            <p>
              Quality comes from planning first — not patching sync after the
              fact.
            </p>
            <div className="lp-features">
              {FEATURES.map((f) => (
                <div key={f.n} className="lp-feature">
                  <div className="n">{f.n}</div>
                  <div className="t">{f.title}</div>
                  <div className="b">{f.body}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="api">
            <h2>Ship with the API</h2>
            <p>
              The demo is for exploring. Production apps call{" "}
              <code
                style={{
                  fontSize: "0.9em",
                  background: "var(--lp-chip)",
                  border: "1px solid var(--lp-line-soft)",
                  borderRadius: 5,
                  padding: "1px 6px",
                }}
              >
                POST /video/request
              </code>{" "}
              with an API key, then poll status until the MP4 URL lands.
            </p>
            <ul>
              <li>Create a key in Settings</li>
              <li>Follow the Quickstart in Docs</li>
              <li>Optional: point storage at your own bucket</li>
            </ul>
            <div
              className="lp-cta-row"
              style={{ justifyContent: "flex-start" }}
            >
              <Link href="/docs/quickstart" className="lp-btn primary">
                Open Quickstart
              </Link>
              <Link href="/docs/api" className="lp-btn">
                API reference
              </Link>
            </div>
          </section>
        </article>

        <footer className="lp-foot">
          <div>
            <Link href="/docs">Docs</Link>
            {" · "}
            <Link href="/settings">Settings</Link>
            {" · "}
            <Link href="/sign-in">Sign in</Link>
          </div>
          <div>
            <span>manimotion</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Pre-validated homepage / chalkboard starter templates.
 * These are Tier-1 (fast, crash-safe) prompts — keep them short and concrete.
 */

export type QualityTier = "tier1" | "tier2" | "tier3";

export type DemoPrompt = {
  n: string;
  label: string;
  prompt: string;
  tier: QualityTier;
  engine: "manim" | "remotion" | "auto";
  /** Target narration/video length hint (seconds). */
  duration: number;
  etaDisplay: string;
};

/** Starters shown on the landing page — must succeed for first-time users. */
export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    n: "01",
    label: "Derivatives",
    prompt:
      "Show how derivatives work with a moving tangent line on y=x^2. Keep it simple: axes, curve, sliding tangent, slope label, final formula d/dx[x^2]=2x.",
    tier: "tier1",
    engine: "manim",
    duration: 30,
    etaDisplay: "~1–2 min",
  },
  {
    n: "02",
    label: "Integrals",
    prompt:
      "Explain an integral as area under a curve using Riemann rectangles that get thinner, then show the exact area for ∫ from 0 to 2 of x^2 dx = 8/3.",
    tier: "tier1",
    engine: "manim",
    duration: 32,
    etaDisplay: "~1–2 min",
  },
  {
    n: "03",
    label: "F = ma",
    prompt:
      "Explain Newton's Second Law F=ma: color-code Force, mass, and acceleration, then show a block accelerating when a force is applied. End with the boxed formula.",
    tier: "tier1",
    engine: "manim",
    duration: 28,
    etaDisplay: "~1–2 min",
  },
  {
    n: "04",
    label: "Euler's identity",
    prompt:
      "Show why e^{iπ}+1=0 on the complex plane: unit circle, rotation by π, land on -1, then the identity. Keep visuals minimal and paced.",
    tier: "tier1",
    engine: "manim",
    duration: 35,
    etaDisplay: "~1–2 min",
  },
];

export function etaForTier(tier: QualityTier = "tier2"): string {
  if (tier === "tier1") return "~1–2 min";
  if (tier === "tier3") return "~4–5 min";
  return "~2–3 min";
}

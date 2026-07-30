/**
 * manimotion pricing — sell renders; differentiate with LLM quality.
 * Bootstrapped: Free API allowed; Pro = Opus-tier models, ~80 renders/mo.
 */

export type PlanId = "FREE" | "HOBBY" | "PRO";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceUsd: number;
  blurb: string;
  rendersLabel: string;
  monthlyRenders: number | null;
  dailyRenders: number | null;
  maxResolution: "720p" | "1080p";
  watermark: boolean;
  apiAccess: boolean;
  /** Models unlocked on this plan (and below). */
  modelTier: string;
  features: string[];
  dodoProductIdEnv: string;
  highlighted?: boolean;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Free",
    priceLabel: "$0",
    priceUsd: 0,
    blurb: "Try the pipeline. API included — solid open models.",
    rendersLabel: "3 renders / day",
    monthlyRenders: null,
    dailyRenders: 3,
    maxResolution: "720p",
    watermark: true,
    apiAccess: true,
    modelTier: "Fast models (DeepSeek, Gemini Flash)",
    dodoProductIdEnv: "",
    features: [
      "3 renders / day",
      "API access (chalk_* keys)",
      "Fast open models",
      "720p · watermark",
      "Low queue priority",
    ],
  },
  {
    id: "HOBBY",
    name: "Hobby",
    priceLabel: "$9",
    priceUsd: 9,
    blurb: "Stronger models for tutors and weekly explainers.",
    rendersLabel: "40 renders / month",
    monthlyRenders: 40,
    dailyRenders: null,
    maxResolution: "1080p",
    watermark: false,
    apiAccess: true,
    modelTier: "GPT-4o · Claude Sonnet",
    dodoProductIdEnv: "DODO_PRODUCT_HOBBY",
    highlighted: true,
    features: [
      "40 renders / month",
      "GPT-4o & Claude Sonnet",
      "1080p · no watermark",
      "API access",
      "Faster queue · commercial use",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    priceLabel: "$19",
    priceUsd: 19,
    blurb: "Best lecture quality. Opus-class models for shipping products.",
    rendersLabel: "80 renders / month",
    monthlyRenders: 80,
    dailyRenders: null,
    maxResolution: "1080p",
    watermark: false,
    apiAccess: true,
    modelTier: "Claude Opus · top-tier models",
    dodoProductIdEnv: "DODO_PRODUCT_PRO",
    features: [
      "80 renders / month",
      "Claude Opus & top-tier models",
      "Everything in Hobby",
      "Priority queue",
      "Longer videos · higher concurrency",
    ],
  },
];

export function getPlan(id: string | null | undefined): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function productIdForPlan(plan: PlanId): string | null {
  const def = getPlan(plan);
  if (!def.dodoProductIdEnv) return null;
  const id = process.env[def.dodoProductIdEnv]?.trim();
  return id || null;
}

export function planFromDodoProductId(productId: string): PlanId | null {
  for (const p of PLANS) {
    if (!p.dodoProductIdEnv) continue;
    const envId = process.env[p.dodoProductIdEnv]?.trim();
    if (envId && envId === productId) return p.id;
  }
  return null;
}

/** Rank for comparing plan unlocks */
export const PLAN_RANK: Record<PlanId, number> = {
  FREE: 0,
  HOBBY: 1,
  PRO: 2,
};

export function planAtLeast(
  userPlan: string | null | undefined,
  required: PlanId
): boolean {
  const u = (userPlan?.toUpperCase() ?? "FREE") as PlanId;
  const userRank = PLAN_RANK[u] ?? 0;
  return userRank >= PLAN_RANK[required];
}

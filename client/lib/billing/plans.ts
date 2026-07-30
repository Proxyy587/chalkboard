/**
 * manimotion pricing — sell renders, not opaque credits.
 * Tuned for a bootstrapped launch (tight free tier, clear paid upgrades).
 */

export type PlanId = "FREE" | "HOBBY" | "PRO";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** Monthly USD for paid plans; 0 for free */
  priceUsd: number;
  blurb: string;
  /** Soft marketing number shown on pricing page */
  rendersLabel: string;
  /** Monthly render allowance for paid; free uses daily quota instead */
  monthlyRenders: number | null;
  /** Free-tier daily cap (UTC day) */
  dailyRenders: number | null;
  maxResolution: "720p" | "1080p";
  watermark: boolean;
  apiAccess: boolean;
  features: string[];
  /** Set after creating products in Dodo dashboard */
  dodoProductIdEnv: string;
  highlighted?: boolean;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Free",
    priceLabel: "$0",
    priceUsd: 0,
    blurb: "Try the pipeline. Enough to decide if it fits.",
    rendersLabel: "3 renders / day",
    monthlyRenders: null,
    dailyRenders: 3,
    maxResolution: "720p",
    watermark: true,
    apiAccess: false,
    dodoProductIdEnv: "",
    features: [
      "3 renders per day",
      "720p output",
      "Watermarked MP4",
      "Low queue priority",
      "Website demo",
    ],
  },
  {
    id: "HOBBY",
    name: "Hobby",
    priceLabel: "$9",
    priceUsd: 9,
    blurb: "For tutors and makers shipping explainers weekly.",
    rendersLabel: "80 renders / month",
    monthlyRenders: 80,
    dailyRenders: null,
    maxResolution: "1080p",
    watermark: false,
    apiAccess: false,
    dodoProductIdEnv: "DODO_PRODUCT_HOBBY",
    highlighted: true,
    features: [
      "80 renders / month",
      "1080p, no watermark",
      "Faster queue",
      "Commercial use",
      "Save storage integrations",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    priceLabel: "$19",
    priceUsd: 19,
    blurb: "For products and APIs. More volume, more control.",
    rendersLabel: "400 renders / month",
    monthlyRenders: 400,
    dailyRenders: null,
    maxResolution: "1080p",
    watermark: false,
    apiAccess: true,
    dodoProductIdEnv: "DODO_PRODUCT_PRO",
    features: [
      "400 renders / month",
      "API access (chalk_* keys)",
      "Higher concurrency",
      "Longer videos",
      "Priority support",
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

/** Map Dodo product id → our plan */
export function planFromDodoProductId(productId: string): PlanId | null {
  for (const p of PLANS) {
    if (!p.dodoProductIdEnv) continue;
    const envId = process.env[p.dodoProductIdEnv]?.trim();
    if (envId && envId === productId) return p.id;
  }
  return null;
}

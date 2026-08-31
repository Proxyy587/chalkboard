import { db } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/billing/plans";
import type { ApiKeyPlan } from "@prisma/client";

function utcMonth(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function websitePlanToKeyPlan(
  plan: string | null | undefined,
): ApiKeyPlan {
  const p = (plan ?? "FREE").toUpperCase();
  if (p === "PRO") return "PRO";
  if (p === "HOBBY") return "STUDENT";
  if (p === "OWNER") return "OWNER";
  if (p === "ENTERPRISE") return "ENTERPRISE";
  if (p === "CREATOR") return "CREATOR";
  return "FREE";
}

export async function syncApiKeysToAccountPlan(
  userId: string,
  websitePlan: string,
) {
  await db.apiKey.updateMany({
    where: { userId, isActive: true, revokedAt: null },
    data: { plan: websitePlanToKeyPlan(websitePlan) },
  });
}

export async function activatePlanForUser(opts: {
  userId: string;
  plan: PlanId;
  dodoCustomerId?: string | null;
  dodoSubscriptionId?: string | null;
  status?: string;
}) {
  const plan = getPlan(opts.plan);
  const credits = plan.monthlyRenders ?? 0;
  await db.user.update({
    where: { id: opts.userId },
    data: {
      plan: opts.plan,
      renderCredits: credits,
      billingPeriod: utcMonth(),
      dodoCustomerId: opts.dodoCustomerId ?? undefined,
      dodoSubscriptionId: opts.dodoSubscriptionId ?? undefined,
      subscriptionStatus: opts.status ?? "active",
    },
  });

  await syncApiKeysToAccountPlan(opts.userId, opts.plan);
}

export async function downgradeToFree(userId: string, status: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      plan: "FREE",
      renderCredits: 0,
      subscriptionStatus: status,
      dodoSubscriptionId: null,
    },
  });
  await syncApiKeysToAccountPlan(userId, "FREE");
}

function digProductId(obj: unknown, depth = 0): string | undefined {
  if (!obj || typeof obj !== "object" || depth > 4) return undefined;
  const rec = obj as Record<string, unknown>;
  if (typeof rec.product_id === "string" && rec.product_id)
    return rec.product_id;
  if (Array.isArray(rec.product_cart) && rec.product_cart[0]) {
    const first = rec.product_cart[0];
    if (first && typeof first === "object") {
      const id = (first as { product_id?: string }).product_id;
      if (typeof id === "string") return id;
    }
  }
  if (rec.product && typeof rec.product === "object") {
    const id = (rec.product as { product_id?: string }).product_id;
    if (typeof id === "string") return id;
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object") {
      const found = digProductId(v, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

export function extractBillingIds(payload: unknown): {
  customerId?: string;
  subscriptionId?: string;
  productId?: string;
  email?: string;
  metadataUserId?: string;
  planHint?: string;
} {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const customer =
    data.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : {};
  const meta =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : root.metadata && typeof root.metadata === "object"
        ? (root.metadata as Record<string, unknown>)
        : {};

  const planHint =
    (typeof meta.plan === "string" && meta.plan) ||
    (typeof data.plan === "string" && data.plan) ||
    undefined;

  return {
    customerId:
      (typeof data.customer_id === "string" && data.customer_id) ||
      (typeof customer.customer_id === "string" && customer.customer_id) ||
      (typeof customer.id === "string" && customer.id) ||
      undefined,
    subscriptionId:
      (typeof data.subscription_id === "string" && data.subscription_id) ||
      (typeof data.subscriptionId === "string" && data.subscriptionId) ||
      undefined,
    productId: digProductId(data) || digProductId(root),
    email:
      (typeof customer.email === "string" && customer.email) ||
      (typeof data.email === "string" && data.email) ||
      undefined,
    metadataUserId:
      (typeof meta.user_id === "string" && meta.user_id) ||
      (typeof meta.userId === "string" && meta.userId) ||
      undefined,
    planHint,
  };
}

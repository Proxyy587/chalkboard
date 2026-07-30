import { db } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/billing/plans";

function utcMonth(d = new Date()): string {
  return d.toISOString().slice(0, 7);
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

  // Align chalk_* keys with website plan (FREE stays FREE; paid → PRO for API)
  if (opts.plan === "PRO" || opts.plan === "HOBBY") {
    await db.apiKey.updateMany({
      where: { userId: opts.userId, isActive: true, revokedAt: null },
      data: { plan: opts.plan === "PRO" ? "PRO" : "STUDENT" },
    });
  }
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
  await db.apiKey.updateMany({
    where: { userId, isActive: true },
    data: { plan: "FREE" },
  });
}

export function extractBillingIds(payload: unknown): {
  customerId?: string;
  subscriptionId?: string;
  productId?: string;
  email?: string;
  metadataUserId?: string;
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
      : {};

  const productId =
    (typeof data.product_id === "string" && data.product_id) ||
    (Array.isArray(data.product_cart) &&
      data.product_cart[0] &&
      typeof data.product_cart[0] === "object" &&
      typeof (data.product_cart[0] as { product_id?: string }).product_id ===
        "string" &&
      (data.product_cart[0] as { product_id: string }).product_id) ||
    undefined;

  return {
    customerId:
      (typeof data.customer_id === "string" && data.customer_id) ||
      (typeof customer.customer_id === "string" && customer.customer_id) ||
      undefined,
    subscriptionId:
      (typeof data.subscription_id === "string" && data.subscription_id) ||
      (typeof data.subscriptionId === "string" && data.subscriptionId) ||
      undefined,
    productId,
    email:
      (typeof customer.email === "string" && customer.email) ||
      (typeof data.email === "string" && data.email) ||
      undefined,
    metadataUserId:
      (typeof meta.user_id === "string" && meta.user_id) ||
      (typeof meta.userId === "string" && meta.userId) ||
      undefined,
  };
}

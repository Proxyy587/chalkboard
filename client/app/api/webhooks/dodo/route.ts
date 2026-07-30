import { createWebhookHandler } from "@/lib/billing/dodo";
import { planFromDodoProductId } from "@/lib/billing/plans";
import {
  activatePlanForUser,
  downgradeToFree,
  extractBillingIds,
} from "@/lib/billing/sync";
import { db } from "@/lib/db";

async function resolveUserId(ids: ReturnType<typeof extractBillingIds>) {
  if (ids.metadataUserId) {
    const byMeta = await db.user.findUnique({
      where: { id: ids.metadataUserId },
      select: { id: true },
    });
    if (byMeta) return byMeta.id;
  }
  if (ids.customerId) {
    const byCustomer = await db.user.findFirst({
      where: { dodoCustomerId: ids.customerId },
      select: { id: true },
    });
    if (byCustomer) return byCustomer.id;
  }
  if (ids.email) {
    const byEmail = await db.user.findUnique({
      where: { email: ids.email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }
  return null;
}

async function onPaid(payload: unknown, status: string) {
  const ids = extractBillingIds(payload);
  const userId = await resolveUserId(ids);
  if (!userId) {
    console.warn("[dodo webhook] no user for payload", ids);
    return;
  }
  const plan = ids.productId ? planFromDodoProductId(ids.productId) : null;
  if (!plan || plan === "FREE") {
    console.warn("[dodo webhook] unknown product", ids.productId);
    return;
  }
  await activatePlanForUser({
    userId,
    plan,
    dodoCustomerId: ids.customerId,
    dodoSubscriptionId: ids.subscriptionId,
    status,
  });
}

async function onCancel(payload: unknown, status: string) {
  const ids = extractBillingIds(payload);
  const userId = await resolveUserId(ids);
  if (!userId) return;
  await downgradeToFree(userId, status);
}

export const POST = createWebhookHandler({
  onSubscriptionActive: (p) => onPaid(p, "active"),
  onSubscriptionRenewed: (p) => onPaid(p, "active"),
  onSubscriptionCancelled: (p) => onCancel(p, "cancelled"),
  onSubscriptionExpired: (p) => onCancel(p, "expired"),
  onSubscriptionFailed: (p) => onCancel(p, "failed"),
});

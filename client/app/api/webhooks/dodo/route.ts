import { NextResponse } from "next/server";

import { planFromDodoProductId, type PlanId } from "@/lib/billing/plans";
import { createWebhookHandler } from "@/lib/billing/dodo";
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

function resolvePlan(ids: ReturnType<typeof extractBillingIds>): PlanId | null {
  if (ids.productId) {
    const fromProduct = planFromDodoProductId(ids.productId);
    if (fromProduct && fromProduct !== "FREE") return fromProduct;
  }
  const hint = ids.planHint?.toUpperCase();
  if (hint === "HOBBY" || hint === "PRO") return hint;
  return null;
}

async function onPaid(payload: unknown, status: string) {
  const ids = extractBillingIds(payload);
  const userId = await resolveUserId(ids);
  if (!userId) {
    console.warn("[dodo webhook] no user for payload", ids);
    return;
  }
  const plan = resolvePlan(ids);
  if (!plan) {
    console.warn("[dodo webhook] unknown product/plan", ids);
    return;
  }
  console.log("[dodo webhook] activating", { userId, plan, status });
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

function payloadType(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const t = (payload as { type?: unknown }).type;
  return typeof t === "string" ? t : "";
}

export async function POST(req: Request) {
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim()) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }
  try {
    const handler = createWebhookHandler({
      onPayload: async (payload) => {
        const type = payloadType(payload);
        console.log("[dodo webhook] event", type);
        // Catch-all for subscription/payment activations the typed handlers miss
        if (
          type === "payment.succeeded" ||
          type === "subscription.active" ||
          type === "subscription.renewed" ||
          type === "subscription.updated"
        ) {
          await onPaid(payload, "active");
        }
      },
      onPaymentSucceeded: (p) => onPaid(p, "active"),
      onSubscriptionActive: (p) => onPaid(p, "active"),
      onSubscriptionRenewed: (p) => onPaid(p, "active"),
      onSubscriptionPlanChanged: (p) => onPaid(p, "active"),
      onSubscriptionUpdated: (p) => onPaid(p, "active"),
      onSubscriptionCancelled: (p) => onCancel(p, "cancelled"),
      onSubscriptionExpired: (p) => onCancel(p, "expired"),
      onSubscriptionFailed: (p) => onCancel(p, "failed"),
      onSubscriptionOnHold: (p) => onCancel(p, "on_hold"),
    });
    return handler(req);
  } catch (e) {
    console.error("[dodo webhook]", e);
    return NextResponse.json(
      { error: "Webhook handler failed to initialize" },
      { status: 503 }
    );
  }
}

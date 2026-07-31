import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/api/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  activatePlanForUser,
  syncApiKeysToAccountPlan,
} from "@/lib/billing/sync";
import type { PlanId } from "@/lib/billing/plans";
import { db } from "@/lib/db";

function dodoBase(): string {
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() || "test_mode";
  return env === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

/**
 * After checkout return: sync keys to account plan, and if still pending,
 * ask Dodo for an active subscription so we don't depend solely on webhooks
 * (local/dev often miss them).
 */
export async function POST() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      plan: true,
      subscriptionStatus: true,
      dodoCustomerId: true,
      renderCredits: true,
      billingPeriod: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Always realign keys → account
  await syncApiKeysToAccountPlan(user.id, row.plan);

  const alreadyPaid =
    row.plan === "HOBBY" || row.plan === "PRO" || row.plan === "OWNER";
  if (alreadyPaid) {
    return NextResponse.json({
      ok: true,
      plan: row.plan,
      renderCredits: row.renderCredits,
      subscriptionStatus: row.subscriptionStatus,
      synced: true,
    });
  }

  const pending = row.subscriptionStatus?.startsWith("pending:")
    ? (row.subscriptionStatus.slice("pending:".length).toUpperCase() as PlanId)
    : null;

  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey || !row.dodoCustomerId) {
    return NextResponse.json({
      ok: true,
      plan: row.plan,
      renderCredits: row.renderCredits,
      subscriptionStatus: row.subscriptionStatus,
      pending,
      synced: false,
      reason: !apiKey ? "missing_dodo_key" : "missing_customer",
    });
  }

  // Pull subscriptions for this customer from Dodo
  try {
    const res = await fetch(
      `${dodoBase()}/subscriptions?customer_id=${encodeURIComponent(row.dodoCustomerId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      items?: Array<Record<string, unknown>>;
      data?: Array<Record<string, unknown>>;
    };
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.data)
        ? data.data
        : [];

    const active = items.find((s) => {
      const st = String(s.status ?? "").toLowerCase();
      return st === "active" || st === "trialing" || st === "succeeded";
    });

    if (active) {
      const productId =
        (typeof active.product_id === "string" && active.product_id) ||
        undefined;
      const { planFromDodoProductId } = await import("@/lib/billing/plans");
      let plan =
        (productId && planFromDodoProductId(productId)) ||
        pending ||
        null;
      if (plan && plan !== "FREE") {
        await activatePlanForUser({
          userId: user.id,
          plan,
          dodoCustomerId: row.dodoCustomerId,
          dodoSubscriptionId:
            typeof active.subscription_id === "string"
              ? active.subscription_id
              : typeof active.id === "string"
                ? active.id
                : null,
          status: "active",
        });
        const refreshed = await db.user.findUnique({
          where: { id: user.id },
          select: {
            plan: true,
            renderCredits: true,
            subscriptionStatus: true,
          },
        });
        return NextResponse.json({
          ok: true,
          plan: refreshed?.plan ?? plan,
          renderCredits: refreshed?.renderCredits ?? 0,
          subscriptionStatus: refreshed?.subscriptionStatus ?? "active",
          synced: true,
          source: "dodo_subscriptions",
        });
      }
    }
  } catch (e) {
    console.warn("[billing/reconcile] dodo fetch failed", e);
  }

  return NextResponse.json({
    ok: true,
    plan: row.plan,
    renderCredits: row.renderCredits,
    subscriptionStatus: row.subscriptionStatus,
    pending,
    synced: false,
  });
}

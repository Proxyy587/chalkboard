import { NextResponse } from "next/server";

import { productIdForPlan, type PlanId } from "@/lib/billing/plans";
import { requireCurrentUser } from "@/lib/auth/session";
import { jsonError, unauthorized } from "@/lib/api/schemas";
import { db } from "@/lib/db";

function dodoBase(): string {
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() || "test_mode";
  return env === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

/**
 * Authenticated checkout — attaches user_id metadata so webhooks can upgrade the plan.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    return jsonError("Payments not configured (DODO_PAYMENTS_API_KEY)", 503);
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const plan = (body.plan ?? "").toUpperCase() as PlanId;
  if (plan !== "HOBBY" && plan !== "PRO") {
    return jsonError("Choose HOBBY or PRO", 400);
  }

  const productId = productIdForPlan(plan);
  if (!productId) {
    return jsonError(
      `Missing ${plan === "HOBBY" ? "DODO_PRODUCT_HOBBY" : "DODO_PRODUCT_PRO"} env`,
      503
    );
  }

  const returnUrl =
    process.env.DODO_PAYMENTS_RETURN_URL?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/settings/billing?checkout=success`;

  const res = await fetch(`${dodoBase()}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user.email,
        name: user.name || user.email.split("@")[0],
      },
      metadata: {
        user_id: user.id,
        plan,
      },
      return_url: returnUrl,
      payment_link: true,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof data.message === "string" && data.message) ||
      (typeof data.error === "string" && data.error) ||
      "Checkout failed";
    return jsonError(msg, res.status);
  }

  await db.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "checkout_started" },
  });

  const url =
    (typeof data.checkout_url === "string" && data.checkout_url) ||
    (typeof data.payment_link === "string" && data.payment_link) ||
    null;

  return NextResponse.json({ ...data, checkout_url: url });
}

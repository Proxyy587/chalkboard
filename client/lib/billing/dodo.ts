import { Checkout, CustomerPortal, Webhooks } from "@dodopayments/nextjs";
import type { WebhookHandlerConfig } from "@dodopayments/core/webhook";

function env() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const returnUrl =
    process.env.DODO_PAYMENTS_RETURN_URL?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/settings/billing?checkout=success`;
  const environment = (process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() ||
    "test_mode") as "test_mode" | "live_mode";

  return { bearerToken, webhookKey, returnUrl, environment };
}

/** @deprecated Public SDK checkout — prefer /api/billing/checkout */
export function createCheckoutHandlers() {
  const { bearerToken, returnUrl, environment } = env();
  if (!bearerToken) {
    throw new Error("DODO_PAYMENTS_API_KEY is not set");
  }
  return {
    POST: Checkout({
      bearerToken,
      returnUrl,
      environment,
      type: "session",
    }),
  };
}

/** @deprecated Prefer authenticated /api/portal */
export function createPortalHandler() {
  const { bearerToken, environment } = env();
  if (!bearerToken) {
    throw new Error("DODO_PAYMENTS_API_KEY is not set");
  }
  return CustomerPortal({
    bearerToken,
    environment,
  });
}

export function createWebhookHandler(
  handlers: Omit<WebhookHandlerConfig, "webhookKey">
) {
  const { webhookKey } = env();
  if (!webhookKey) {
    throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not set");
  }
  return Webhooks({
    webhookKey,
    ...handlers,
  }) as unknown as (req: Request) => Promise<Response> | Response;
}

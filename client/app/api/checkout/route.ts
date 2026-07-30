import { createCheckoutHandlers } from "@/lib/billing/dodo";

const handlers = createCheckoutHandlers();

/** POST — create a Dodo checkout session (subscription / payment). */
export const POST = handlers.POST;
